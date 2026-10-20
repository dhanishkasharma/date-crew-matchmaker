import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { z } from "zod";
import { config } from "./config";
import {
  CustomerModel,
  NoteModel,
  ProfileModel,
  SendModel,
  UserModel,
} from "./models";
import {
  preferencesSchema,
  profileSchema,
  stageSchema,
  type Customer,
  type Profile,
  type Stage,
} from "../shared/schema";
import {
  eligibility,
  POLICY_VERSION,
  rankMatches,
  scorePair,
} from "../shared/matching";
import { generateIntroduction } from "./introductions";
import { reviewShortlist } from "./shortlist-review";
import {
  getPreferenceProposal,
  preferenceSnapshot,
  proposePreferences,
  removePreferenceProposal,
} from "./preference-assistant";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function createApp() {
  const app = express();
  if (config.production) app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "24kb" }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(
    session({
      name: "tdc.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "sessions",
        ttl: 86400,
      }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.production,
        maxAge: 86400000,
      },
    }),
  );
  app.use("/api", (req, _res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== config.origin
    )
      return next(new HttpError(403, "This request origin is not allowed."));
    next();
  });
  const loginLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again in 15 minutes." },
  });
  const aiLimit = rateLimit({
    windowMs: 10 * 60000,
    limit: 10,
    keyGenerator: (req) => req.session.userId!,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "AI request limit reached. Try again in 10 minutes." },
  });
  const publicUser = (user: {
    _id: unknown;
    name?: string | null;
    username: string;
    role?: string | null;
  }) => ({
    id: String(user._id),
    name: user.name || user.username,
    username: user.username,
    role: user.role || "Matchmaker",
  });
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.post("/api/auth/login", loginLimit, async (req, res) => {
    const input = z
      .object({
        username: z.string().trim().min(1).max(80),
        password: z.string().min(1).max(128),
      })
      .parse(req.body);
    const user = await UserModel.findOne({
      username: input.username.toLowerCase(),
    });
    // Perform a hash comparison even for an unknown username to avoid a quick miss.
    const hash =
      user?.passwordHash ||
      "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttxf8vTnb8MYL0w5F4fzP3NPEvPy";
    const valid = await bcrypt.compare(input.password, hash);
    if (!user || !valid)
      throw new HttpError(401, "The username or password is incorrect.");
    await new Promise<void>((ok, fail) =>
      req.session.regenerate((error) => (error ? fail(error) : ok())),
    );
    req.session.userId = String(user._id);
    await new Promise<void>((ok, fail) =>
      req.session.save((error) => (error ? fail(error) : ok())),
    );
    res.json(publicUser(user));
  });
  app.post("/api/auth/logout", (req, res, next) =>
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("tdc.sid", { path: "/" });
      res.json({ ok: true });
    }),
  );
  app.use("/api", async (req, res, next) => {
    if (!req.session.userId)
      throw new HttpError(401, "Please sign in to continue.");
    const user = await UserModel.findById(req.session.userId);
    if (!user) throw new HttpError(401, "Please sign in again.");
    res.locals.user = publicUser(user);
    next();
  });
  const ownCustomer = async (req: Request): Promise<Customer> => {
    const record = await CustomerModel.findOne({
      _id: String(req.params.id),
      ownerId: req.session.userId,
    }).lean();
    if (!record) throw new HttpError(404, "Customer not found.");
    const profile = await ProfileModel.findById(record.profileId).lean();
    if (!profile) throw new HttpError(404, "Profile not found.");
    return {
      id: String(record._id),
      ownerId: record.ownerId,
      stage: record.stage as Stage,
      updatedAt: record.updatedAt.toISOString(),
      profile: profileSchema.parse(profile.data),
    };
  };
  const eligiblePair = async (req: Request, candidateId: string) => {
    const customer = await ownCustomer(req);
    if (
      !customer.profile.verified ||
      ["Paused", "Closed", "Onboarding"].includes(customer.stage)
    )
      throw new HttpError(409, "This customer is not ready for introductions.");
    const record = await ProfileModel.findOne({
      _id: candidateId,
      kind: "candidate",
    }).lean();
    if (!record) throw new HttpError(404, "Candidate not found.");
    const candidate = profileSchema.parse(record.data);
    if (eligibility(customer.profile, candidate).length)
      throw new HttpError(
        409,
        "This candidate no longer meets the saved matching criteria.",
      );
    return { customer, match: scorePair(customer.profile, candidate) };
  };
  app.get("/api/bootstrap", async (req, res) => {
    const records = await CustomerModel.find({
      ownerId: req.session.userId,
    }).lean();
    const ids = records.map((r) => r._id);
    const [profiles, pool, notes, sends] = await Promise.all([
      ProfileModel.find({
        _id: { $in: records.map((r) => r.profileId) },
      }).lean(),
      ProfileModel.find({ kind: "candidate" }).lean(),
      NoteModel.find({ ownerId: req.session.userId, customerId: { $in: ids } })
        .sort({ createdAt: -1 })
        .lean(),
      SendModel.find({ ownerId: req.session.userId, customerId: { $in: ids } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    const customers = records.map((r) => ({
      id: String(r._id),
      ownerId: r.ownerId,
      stage: r.stage,
      updatedAt: r.updatedAt.toISOString(),
      profile: profileSchema.parse(
        profiles.find((p) => p._id === r.profileId)?.data,
      ),
    }));
    res.json({
      user: res.locals.user,
      customers,
      candidates: pool.map((p) => profileSchema.parse(p.data)),
      notes: notes.map((n) => ({
        id: n._id,
        customerId: n.customerId,
        type: n.type,
        text: n.text,
        author: n.author,
        createdAt: n.createdAt.toISOString(),
      })),
      sends: sends.map((s) => ({
        id: s._id,
        customerId: s.customerId,
        candidateId: s.candidateId,
        subject: s.subject,
        introduction: s.introduction,
        source: s.source,
        policyVersion: s.policyVersion,
        createdAt: s.createdAt.toISOString(),
      })),
      aiConfigured: !!config.geminiKey,
      storage: config.mongoUri ? "atlas" : "local",
    });
  });
  app.patch("/api/customers/:id/stage", async (req, res) => {
    await ownCustomer(req);
    const { stage } = z.object({ stage: stageSchema }).parse(req.body);
    await CustomerModel.updateOne(
      { _id: String(req.params.id), ownerId: req.session.userId },
      { $set: { stage } },
    );
    res.json({ ok: true });
  });
  app.patch("/api/customers/:id/preferences", async (req, res) => {
    const customer = await ownCustomer(req);
    const preferences = preferencesSchema.parse(req.body);
    await ProfileModel.updateOne(
      { _id: customer.profile.id },
      { $set: { "data.preferences": preferences } },
    );
    await CustomerModel.updateOne(
      { _id: customer.id },
      { $set: { updatedAt: new Date() } },
    );
    res.json({ ok: true });
  });
  app.post("/api/customers/:id/notes", async (req, res) => {
    const customer = await ownCustomer(req);
    const input = z
      .object({
        type: z.enum(["Meeting", "Call", "Note"]),
        text: z.string().trim().min(1).max(3000),
      })
      .parse(req.body);
    await NoteModel.create({
      _id: randomUUID(),
      customerId: customer.id,
      ownerId: req.session.userId,
      author: res.locals.user.name,
      ...input,
    });
    res.status(201).json({ ok: true });
  });
  app.get("/api/customers/:id/matches", async (req, res) => {
    const customer = await ownCustomer(req);
    const candidates = await ProfileModel.find({ kind: "candidate" }).lean();
    res.json(
      rankMatches(
        customer.profile,
        candidates.map((p) => p.data as Profile),
      ),
    );
  });
  const candidatePool = async () =>
    (
      await ProfileModel.find({ kind: "candidate" }).sort({ _id: 1 }).lean()
    ).map((p) => profileSchema.parse(p.data));
  app.post("/api/customers/:id/shortlist-review", aiLimit, async (req, res) => {
    const customer = await ownCustomer(req);
    const pool = await candidatePool();
    res.json(
      await reviewShortlist(
        req.session.userId!,
        customer.id,
        customer.profile,
        rankMatches(customer.profile, pool),
      ),
    );
  });
  app.post(
    "/api/customers/:id/preference-proposals",
    aiLimit,
    async (req, res) => {
      const customer = await ownCustomer(req);
      const { text } = z
        .object({ text: z.string().trim().min(8).max(1500) })
        .strict()
        .parse(req.body);
      const pool = await candidatePool();
      res.json(
        await proposePreferences(req.session.userId!, customer, pool, text),
      );
    },
  );
  app.post(
    "/api/customers/:id/preference-proposals/:proposalId/apply",
    async (req, res) => {
      const customer = await ownCustomer(req);
      const id = String(req.params.proposalId);
      const proposal = getPreferenceProposal(
        id,
        req.session.userId!,
        customer.id,
      );
      if (!proposal)
        throw new HttpError(
          409,
          "This preview has expired. Generate a new preview before applying preferences.",
        );
      const pool = await candidatePool();
      if (preferenceSnapshot(customer, pool) !== proposal.baseline)
        throw new HttpError(
          409,
          "The profile or candidate pool changed. Generate a fresh preview before applying preferences.",
        );
      // Compare and swap prevents a late preview from overwriting a concurrent edit.
      const result = await ProfileModel.updateOne(
        { _id: customer.profile.id, "data.preferences": proposal.before },
        {
          $set: { "data.preferences": preferencesSchema.parse(proposal.after) },
        },
      );
      if (!result.modifiedCount)
        throw new HttpError(
          409,
          "Preferences changed. Generate a fresh preview before applying them.",
        );
      removePreferenceProposal(id);
      await CustomerModel.updateOne(
        { _id: customer.id, ownerId: req.session.userId },
        { $set: { updatedAt: new Date() } },
      );
      res.json({ ok: true });
    },
  );
  app.post("/api/customers/:id/introductions", aiLimit, async (req, res) => {
    const { candidateId } = z
      .object({ candidateId: z.string().max(100) })
      .parse(req.body);
    const { customer, match } = await eligiblePair(req, candidateId);
    res.json(await generateIntroduction(customer.profile, match));
  });
  app.post("/api/customers/:id/sends", async (req, res) => {
    const input = z
      .object({
        candidateId: z.string().max(100),
        subject: z.string().trim().min(5).max(160),
        introduction: z.string().trim().min(30).max(3000),
        source: z.enum(["gemini", "template", "edited"]),
      })
      .parse(req.body);
    const { customer, match } = await eligiblePair(req, input.candidateId);
    const result = await SendModel.updateOne(
      { customerId: customer.id, candidateId: input.candidateId },
      {
        $setOnInsert: {
          _id: randomUUID(),
          ownerId: req.session.userId,
          ...input,
          policyVersion: POLICY_VERSION,
          score: match.score,
        },
      },
      { upsert: true },
    );
    res
      .status(result.upsertedCount ? 201 : 200)
      .json({ ok: true, duplicate: !result.upsertedCount });
  });
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "Endpoint not found.")),
  );
  if (config.production) {
    app.use(express.static(resolve("dist/client")));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve("dist/client/index.html")),
    );
  }
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof z.ZodError)
        return res.status(400).json({
          error: error.issues[0]?.message || "Please check the form values.",
        });
      if (error instanceof HttpError)
        return res.status(error.status).json({ error: error.message });
      if (error instanceof Error && "code" in error && error.code === 11000)
        return res
          .status(409)
          .json({ error: "This match has already been sent." });
      console.error(
        "Request failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      res.status(500).json({
        error:
          "Something went wrong. Your changes were not saved. Please try again.",
      });
    },
  );
  return app;
}
