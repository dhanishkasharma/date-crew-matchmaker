import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".env")) {
  const template = readFileSync(".env.example", "utf8").replace(
    "replace-with-a-long-random-value-before-deployment",
    randomBytes(32).toString("hex"),
  );
  writeFileSync(".env", template, { mode: 0o600 });
  console.info(
    "Created .env with a random session secret. Add your MongoDB URI and Gemini key locally.",
  );
} else console.info(".env already exists; existing values were preserved.");
