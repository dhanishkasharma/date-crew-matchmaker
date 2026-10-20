import { connectDatabase } from "./database";
import { refreshDemoText } from "./refresh-demo-text";

const database = await connectDatabase();
try {
  console.log(await refreshDemoText(process.argv.includes("--apply")));
} finally {
  await database.close();
}
