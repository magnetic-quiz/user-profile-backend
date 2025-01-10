import { Schema, model } from "mongoose";

const UserSchema = new Schema({
  userID: {
    type: String,
    required: true,
    unique: true,
  },
  username: { type: String, unique: false },
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
      default: 0,
    },
  },
  quizIDs: [{ type: String, default: "" }],
});

export const User = model("User", UserSchema);
