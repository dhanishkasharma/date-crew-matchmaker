import { createApp } from "./app";
import { connectDatabase } from "./database";
import { seedDatabase } from "./seed";
import { config } from "./config";

try {
  const database = await connectDatabase();
  await seedDatabase();
  const server = createApp().listen(
    config.port,
    config.production ? "0.0.0.0" : "127.0.0.1",
    () => console.info(`TDC API ready at http://127.0.0.1:${config.port}`),
  );
  const shutdown = () =>
    server.close(() => {
      void database.close().then(() => process.exit(0));
    });
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (error) {
  console.error(
    "Could not start TDC. Check MongoDB connection, network access, and environment configuration.",
    error instanceof Error ? error.name : "",
  );
  process.exit(1);
}
