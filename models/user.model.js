import { Schema, model } from "mongoose";

const UserSchema = new Schema({
  userID: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: { type: String, unique: false },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  plan: {
    type: {
      type: String,
      enum: ["Trial", "Pro", "Enterprise"],
      default: "Trial",
    },
    responsesLeft: {
      type: Number,
      default: 10,
    },
  },
  quizIDs: [{ type: String }],
});

export const User = model("User", UserSchema);
