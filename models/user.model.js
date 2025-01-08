import { Schema, model } from "mongoose";

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  contact: {
    email: String,
    phone: String,
  },
  plan: {
    type: {
      type: String,
      enum: ["Free", "Pro", "Enterprise"],
      default: "Free",
    },
    expiry: Date,
    responsesLeft: Number,
  },
  onboardingPreferences: {
    type: Object,
  },
  quizzes: [
    {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
    },
  ],
});

export const User = model("User", UserSchema);
