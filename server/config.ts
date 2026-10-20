import "dotenv/config";
import { randomBytes } from "node:crypto";
const production = process.env.NODE_ENV === "production";
if (
  production &&
  (!process.env.MONGODB_URI ||
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32 ||
    process.env.SESSION_SECRET.startsWith("replace-"))
)
  throw new Error(
    "Production requires MONGODB_URI and a SESSION_SECRET of at least 32 characters.",
  );
export const config = {
  production,
  port: Number(process.env.PORT || 4000),
  origin: process.env.APP_ORIGIN || "http://127.0.0.1:5173",
  mongoUri: process.env.MONGODB_URI || "",
  sessionSecret:
    process.env.SESSION_SECRET &&
    !process.env.SESSION_SECRET.startsWith("replace-")
      ? process.env.SESSION_SECRET
      : randomBytes(32).toString("hex"),
  geminiKey: process.env.GEMINI_API_KEY || "",
  model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
};
