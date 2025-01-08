import { Schema, model } from "mongoose";

const UserSchema = new Schema({
  userID: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: { type: String },
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
    expiry: {
      type: Date,
      default: null,
    },
    responsesLeft: {
      type: Number,
      default: 0,
    },
  },
  quizIDs: [{ type: String }],
});

export const User = model("User", UserSchema);
