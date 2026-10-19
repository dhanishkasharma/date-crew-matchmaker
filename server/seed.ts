import bcrypt from "bcryptjs";
import { createSeed, demoUsers, DEMO_PASSWORD } from "../shared/seed";
import {
  CustomerModel,
  NoteModel,
  ProfileModel,
  SendModel,
  UserModel,
} from "./models";

export async function seedDatabase() {
  const seed = createSeed();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await UserModel.bulkWrite(
    demoUsers.map((user) => ({
      updateOne: {
        filter: { _id: user.id },
        update: { $setOnInsert: { ...user, _id: user.id, passwordHash } },
        upsert: true,
      },
    })),
  );
  await ProfileModel.bulkWrite(
    [
      ...seed.clients.map((data) => ({ data, kind: "customer" })),
      ...seed.candidates.map((data) => ({ data, kind: "candidate" })),
    ].map(({ data, kind }) => ({
      updateOne: {
        filter: { _id: data.id },
        update: { $setOnInsert: { data, kind } },
        upsert: true,
      },
    })),
  );
  await CustomerModel.bulkWrite(
    seed.customers.map((customer) => ({
      updateOne: {
        filter: { _id: customer.id },
        update: { $setOnInsert: { ...customer, _id: customer.id } },
        upsert: true,
      },
    })),
  );
  await NoteModel.updateOne(
    { _id: "welcome-note-1" },
    {
      $setOnInsert: {
        _id: "welcome-note-1",
        customerId: "customer-1",
        ownerId: demoUsers[0].id,
        type: "Call",
        text: "Had a lovely first conversation. Ananya values independence and a partner who supports her career. Open to Mumbai or Pune for the right connection.",
        author: demoUsers[0].name,
        createdAt: new Date(Date.now() - 86400000),
      },
    },
    { upsert: true },
  );
  await Promise.all([
    UserModel.init(),
    ProfileModel.init(),
    CustomerModel.init(),
    NoteModel.init(),
    SendModel.init(),
  ]);
}
