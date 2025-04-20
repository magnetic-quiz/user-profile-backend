import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
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
        alias: "planType",
      },
      responsesLeft: {
        type: Number,
        default: 10,
      },
    },
    status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "pending_approval",
        "cancelled",
        "expired",
        "incomplete",
      ],
      default: "pending_approval", // Default until confirmed
    },
    paypalSubscriptionID: {
      type: String,
      unique: true, // Each PayPal subscription should only be linked once
      sparse: true, // Allows multiple users to NOT have this field (nulls are not unique)
    },
    trialEndDate: {
      type: Date,
    },
    quizIDs: [{ type: String }],
  },
  { timestamps: true }
);

export const User = model("User", UserSchema);
