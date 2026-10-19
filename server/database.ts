import mongoose from "mongoose";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "./config";

export async function connectDatabase() {
  let uri = config.mongoUri;
  let local: { stop: () => Promise<unknown> } | undefined;
  if (!uri) {
    if (config.production)
      throw new Error("MONGODB_URI is required in production.");
    // Development only: a real MongoDB process with disk-backed collections.
    const { MongoMemoryServer } = await import("mongodb-memory-server-core");
    const dbPath = resolve(".data/mongodb");
    await mkdir(dbPath, { recursive: true });
    const instance = await MongoMemoryServer.create({
      binary: { version: "8.0.17" },
      instance: {
        dbPath,
        storageEngine: "wiredTiger",
        dbName: "tdc_matchmaker",
      },
    });
    uri = instance.getUri("tdc_matchmaker");
    local = instance;
    console.info(
      "Development MongoDB: disk persistence in .data/mongodb. Configure MONGODB_URI for Atlas.",
    );
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  return {
    close: async () => {
      await mongoose.disconnect();
      await local?.stop();
    },
  };
}
