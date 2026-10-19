import { connectDatabase } from "./database";
import { seedDatabase } from "./seed";
const db = await connectDatabase();
await seedDatabase();
console.info(
  "Seed ready: 200 candidates, 12 customers, 2 matchmakers. Existing operational data is preserved.",
);
await db.close();
