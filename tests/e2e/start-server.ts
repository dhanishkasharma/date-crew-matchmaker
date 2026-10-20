import { randomBytes } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server-core";

// Browser tests use their own real database and never consume the live AI key.
const mongo = await MongoMemoryServer.create({ binary: { version: "8.0.17" } });
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_URI: mongo.getUri("tdc_browser_tests"),
  GEMINI_API_KEY: "",
  SESSION_SECRET: randomBytes(32).toString("hex"),
  PORT: "4100",
  APP_ORIGIN: "http://127.0.0.1:5174",
});
await import("../../server/index");
process.on("exit", () => {
  void mongo.stop();
});
