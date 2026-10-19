import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import supertest from "supertest";
import { createApp } from "../server/app";
import { seedDatabase } from "../server/seed";
import { DEMO_PASSWORD } from "../shared/seed";
import type { Bootstrap } from "../shared/schema";
import type { MatchReport } from "../shared/matching";
import { config } from "../server/config";

let mongo: MongoMemoryServer,
  app: ReturnType<typeof createApp>,
  agent: ReturnType<typeof supertest.agent>,
  candidateId: string;
beforeAll(async () => {
  // Integration tests must never consume a developer's real Gemini quota.
  config.geminiKey = "";
  mongo = await MongoMemoryServer.create({ binary: { version: "8.0.17" } });
  await mongoose.connect(mongo.getUri("tdc_tests"));
  await seedDatabase();
  app = createApp();
  agent = supertest.agent(app);
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
describe("authenticated MongoDB API", () => {
  it("rejects anonymous access and bad credentials", async () => {
    expect((await supertest(app).get("/api/bootstrap")).status).toBe(401);
    expect(
      (
        await agent
          .post("/api/auth/login")
          .send({ username: "priya", password: "wrong" })
      ).status,
    ).toBe(401);
  });
  it("logs in with an HttpOnly cookie and returns only assigned customers", async () => {
    const login = await agent
      .post("/api/auth/login")
      .send({ username: "priya", password: DEMO_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"][0]).toContain("HttpOnly");
    const bootstrap = await agent.get("/api/bootstrap");
    const data = bootstrap.body as Bootstrap;
    expect(data.customers).toHaveLength(10);
    expect(data.candidates).toHaveLength(200);
    expect(data.customers.every((c) => c.ownerId === "matchmaker-1")).toBe(
      true,
    );
    expect(JSON.stringify(data)).not.toContain("passwordHash");
  });
  it("denies direct access and writes to another matchmaker’s customer", async () => {
    expect((await agent.get("/api/customers/customer-11/matches")).status).toBe(
      404,
    );
    expect(
      (
        await agent
          .post("/api/customers/customer-11/notes")
          .send({ type: "Note", text: "unauthorized" })
      ).status,
    ).toBe(404);
    expect(
      (
        await agent
          .patch("/api/customers/customer-11/stage")
          .send({ stage: "Closed" })
      ).status,
    ).toBe(404);
  });
  it("rejects invalid form data and hostile browser origins", async () => {
    expect(
      (
        await agent
          .post("/api/customers/customer-1/notes")
          .send({ type: "Note", text: "  " })
      ).status,
    ).toBe(400);
    expect(
      (
        await agent
          .patch("/api/customers/customer-1/stage")
          .send({ stage: "Invented" })
      ).status,
    ).toBe(400);
    expect(
      (
        await agent
          .post("/api/customers/customer-1/notes")
          .set("Origin", "https://other.example")
          .send({ type: "Note", text: "cross-origin" })
      ).status,
    ).toBe(403);
  });
  it("persists notes, stage changes, and edited preferences", async () => {
    expect(
      (
        await agent.post("/api/customers/customer-1/notes").send({
          type: "Call",
          text: "Integration test note: confirm relocation.",
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await agent
          .patch("/api/customers/customer-1/stage")
          .send({ stage: "Introductions" })
      ).status,
    ).toBe(200);
    const initial = (await agent.get("/api/bootstrap")).body as Bootstrap;
    const preferences = {
      ...initial.customers[0].profile.preferences,
      minAge: 25,
    };
    expect(
      (
        await agent
          .patch("/api/customers/customer-1/preferences")
          .send(preferences)
      ).status,
    ).toBe(200);
    const updated = (await agent.get("/api/bootstrap")).body as Bootstrap;
    expect(
      updated.notes.some(
        (n) => n.text === "Integration test note: confirm relocation.",
      ),
    ).toBe(true);
    expect(updated.customers.find((c) => c.id === "customer-1")?.stage).toBe(
      "Introductions",
    );
    expect(
      updated.customers.find((c) => c.id === "customer-1")?.profile.preferences
        .minAge,
    ).toBe(25);
  });
  it("returns eligible matches and a clearly labeled template when no key is configured", async () => {
    const report = (await agent.get("/api/customers/customer-1/matches"))
      .body as MatchReport;
    expect(report.pool).toBe(100);
    expect(report.eligible).toBeGreaterThan(0);
    candidateId = report.matches[0].candidate.id;
    const result = await agent
      .post("/api/customers/customer-1/introductions")
      .send({ candidateId });
    expect(result.status).toBe(200);
    expect(result.body.source).toBe("template");
    expect(result.body.introduction).toContain("Ananya");
  });
  it("records one mock send, including after a retry", async () => {
    const payload = {
      candidateId,
      subject: "A thoughtful introduction",
      introduction:
        "Here is a fictional introduction for the purpose of the integration test.",
      source: "template",
    };
    expect(
      (await agent.post("/api/customers/customer-1/sends").send(payload))
        .status,
    ).toBe(201);
    const retry = await agent
      .post("/api/customers/customer-1/sends")
      .send(payload);
    expect(retry.status).toBe(200);
    expect(retry.body.duplicate).toBe(true);
    expect(
      ((await agent.get("/api/bootstrap")).body as Bootstrap).sends.filter(
        (s) => s.candidateId === candidateId,
      ),
    ).toHaveLength(1);
  });
  it("re-checks eligibility when sending, including paused customers and unverified candidates", async () => {
    await agent
      .patch("/api/customers/customer-1/stage")
      .send({ stage: "Paused" });
    expect(
      (
        await agent
          .post("/api/customers/customer-1/introductions")
          .send({ candidateId })
      ).status,
    ).toBe(409);
    await agent
      .patch("/api/customers/customer-1/stage")
      .send({ stage: "Shortlisting" });
    expect(
      (
        await agent
          .post("/api/customers/customer-1/introductions")
          .send({ candidateId: "pool-m-10" })
      ).status,
    ).toBe(409);
  });
  it("isolates the second account and invalidates logout sessions", async () => {
    const second = supertest.agent(app);
    await second
      .post("/api/auth/login")
      .send({ username: "rohan", password: DEMO_PASSWORD });
    expect(
      ((await second.get("/api/bootstrap")).body as Bootstrap).customers,
    ).toHaveLength(2);
    expect((await second.get("/api/customers/customer-1/matches")).status).toBe(
      404,
    );
    await second.post("/api/auth/logout").send({});
    expect((await second.get("/api/bootstrap")).status).toBe(401);
  });
});
