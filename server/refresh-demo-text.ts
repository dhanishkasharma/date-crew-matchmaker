import { createSeed, LEGACY_BIO, LEGACY_CAREER_PRIORITY } from "../shared/seed";
import { ProfileModel } from "./models";

/** Update only known legacy seed text. Existing preferences, notes and sends are untouched. */
export async function refreshDemoText(apply = false) {
  const seed = createSeed();
  const profiles = new Map(
    [...seed.clients, ...seed.candidates].map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const records = await ProfileModel.find({
    _id: { $in: [...profiles.keys()] },
  })
    .select({ _id: 1, "data.bio": 1, "data.careerPriority": 1 })
    .lean();
  const updates = records.flatMap((record) => {
    const profile = profiles.get(String(record._id))!;
    return (
      [
        ["bio", LEGACY_BIO],
        ["careerPriority", LEGACY_CAREER_PRIORITY],
      ] as const
    )
      .filter(([field, legacy]) => record.data[field] === legacy)
      .map(([field, legacy]) => ({
        updateOne: {
          filter: { _id: profile.id, [`data.${field}`]: legacy },
          update: { $set: { [`data.${field}`]: profile[field] } },
        },
      }));
  });
  const fields =
    apply && updates.length
      ? (await ProfileModel.bulkWrite(updates)).modifiedCount
      : updates.length;
  return { apply, fields };
}
