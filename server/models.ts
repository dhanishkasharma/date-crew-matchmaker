import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  _id: String,
  username: { type: String, unique: true, required: true },
  name: String,
  role: String,
  passwordHash: { type: String, required: true },
});
const profileSchema = new Schema({
  _id: String,
  kind: { type: String, enum: ["customer", "candidate"], required: true },
  data: { type: Schema.Types.Mixed, required: true },
});
const customerSchema = new Schema(
  {
    _id: String,
    profileId: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    stage: { type: String, required: true },
  },
  { timestamps: true },
);
const noteSchema = new Schema(
  {
    _id: String,
    customerId: { type: String, index: true, required: true },
    ownerId: { type: String, required: true },
    type: String,
    text: String,
    author: String,
  },
  { timestamps: true },
);
const sendSchema = new Schema(
  {
    _id: String,
    customerId: { type: String, required: true },
    candidateId: { type: String, required: true },
    ownerId: { type: String, required: true },
    subject: String,
    introduction: String,
    source: String,
    policyVersion: String,
    score: Number,
  },
  { timestamps: true },
);
sendSchema.index({ customerId: 1, candidateId: 1 }, { unique: true });
export const UserModel = mongoose.model("User", userSchema);
export const ProfileModel = mongoose.model("Profile", profileSchema);
export const CustomerModel = mongoose.model("Customer", customerSchema);
export const NoteModel = mongoose.model("Note", noteSchema);
export const SendModel = mongoose.model("Send", sendSchema);
