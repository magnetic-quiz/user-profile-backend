import { User } from "../models/user.model.js";
import axios from "axios"; // Import axios for API calls
import dotenv from "dotenv";

dotenv.config();

// --- PayPal API Helper Functions ---

// Function to get PayPal Access Token
const getPayPalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  const url = `${process.env.PAYPAL_API_BASE_URL}/v1/oauth2/token`;

  // Basic Auth: base64 encode "CLIENT_ID:SECRET"
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  try {
    const response = await axios.post(url, "grant_type=client_credentials", {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en_US",
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error(
      "❌ Error getting PayPal access token:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to authenticate with PayPal");
  }
};

// Function to verify PayPal Subscription Details
const verifyPayPalSubscription = async (subscriptionID) => {
  try {
    const accessToken = await getPayPalAccessToken();
    const url = `${process.env.PAYPAL_API_BASE_URL}/v1/billing/subscriptions/${subscriptionID}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    console.log(
      `✅ PayPal Subscription ${subscriptionID} status: ${response.data.status}`
    );
    // Check for expected plan ID if necessary
    // if (response.data.plan_id !== process.env.EXPECTED_PAYPAL_PLAN_ID) {
    //    throw new Error("Subscription plan mismatch.");
    // }
    return response.data; // Contains status, plan_id, start_time, billing_info etc.
  } catch (error) {
    console.error(
      `❌ Error verifying PayPal subscription ${subscriptionID}:`,
      error.response ? error.response.data : error.message
    );
    if (error.response && error.response.status === 404) {
      throw new Error(`PayPal Subscription ${subscriptionID} not found.`);
    }
    throw new Error("Failed to verify subscription with PayPal.");
  }
};

// --- New Controller Function for Subscription Update ---
export const updateSubscriptionStatus = async (req, res) => {
  const { userID, subscriptionID } = req.body;

  // 1. Validate Input
  if (!userID || !subscriptionID) {
    return res
      .status(400)
      .json({ message: "Missing required fields: userID and subscriptionID" });
  }

  try {
    // 2. Find the user in your database
    const user = await User.findOne({ userID });
    if (!user) {
      return res
        .status(404)
        .json({ message: `User with userID ${userID} not found.` });
    }

    // 3. Check if this subscriptionID is already assigned (idempotency)
    if (
      user.paypalSubscriptionID === subscriptionID &&
      user.status !== "pending_approval"
    ) {
      console.log(
        `Subscription ${subscriptionID} already processed for user ${userID}.`
      );
      return res.status(200).json(user); // Already done, return success
    }
    // Check if ID assigned to *another* user (security/error case)
    const subAssignedToOther = await User.findOne({
      paypalSubscriptionID: subscriptionID,
      userID: { $ne: userID },
    });
    if (subAssignedToOther) {
      console.error(
        `Error: PayPal Subscription ID ${subscriptionID} is already assigned to another user ${subAssignedToOther.userID}`
      );
      return res
        .status(409)
        .json({ message: `Subscription ID conflict. Please contact support.` });
    }

    // 4. (Recommended) Verify the subscription with PayPal
    console.log(
      `Verifying PayPal subscription ${subscriptionID} for user ${userID}...`
    );
    const paypalSubDetails = await verifyPayPalSubscription(subscriptionID);

    // Check PayPal status - needs to be active or potentially still pending briefly
    // APPROVAL_PENDING: User approved, but PayPal processing might take a moment
    // ACTIVE: Billing active (trialing is considered ACTIVE)
    if (
      paypalSubDetails.status !== "ACTIVE" &&
      paypalSubDetails.status !== "APPROVAL_PENDING"
    ) {
      console.warn(
        `PayPal subscription ${subscriptionID} has status ${paypalSubDetails.status}. Not updating user plan.`
      );
      // Maybe update status to 'incomplete' or similar in DB?
      // For now, return an error indicating unexpected status
      return res.status(400).json({
        message: `Subscription status is ${paypalSubDetails.status}. Cannot activate plan.`,
      });
    }

    // 5. Update user's plan details in your database
    user.paypalSubscriptionID = subscriptionID;

    // Determine plan status and trial end date
    // Note: PayPal's ACTIVE status covers both trialing and paid periods.
    // You might need more logic if you want to distinguish based on billing cycles.
    // Assuming the plan configured in PayPal has a trial:
    if (
      paypalSubDetails.billing_info &&
      paypalSubDetails.billing_info.cycle_executions &&
      paypalSubDetails.billing_info.cycle_executions.length > 0 &&
      paypalSubDetails.billing_info.cycle_executions[0].tenure_type === "TRIAL"
    ) {
      user.status = "trialing";
      // Try to get trial end date from PayPal if available (might need specific API calls or webhook data)
      // For simplicity, calculate based on current date + trial duration (e.g., 14 days)
      // This is an approximation if the exact time isn't available from this API call.
      const trialDays = 14; // Or get from your plan config
      user.trialEndDate = new Date(
        Date.now() + trialDays * 24 * 60 * 60 * 1000
      );
      console.log(
        `User ${userID} plan set to 'trialing'. Trial ends approx: ${user.trialEndDate}`
      );
    } else {
      user.status = "active"; // No trial info found or trial tenure is not first, assume active paid
      user.trialEndDate = null; // Clear any previous trial date
      console.log(`User ${userID} plan set to 'active'.`);
    }

    await user.save();
    console.log(
      `✅ Successfully updated user ${userID} plan to Pro with subscription ${subscriptionID}.`
    );

    // 6. Send success response
    res.status(200).json(user); // Send back the updated user document
  } catch (error) {
    console.error(
      `❌ Error updating subscription status for user ${userID}:`,
      error.message
    );
    // Provide specific messages based on error type if possible
    if (
      error.message.includes("PayPal Subscription") ||
      error.message.includes("Failed to verify")
    ) {
      res.status(502).json({
        message: `Error verifying subscription with PayPal: ${error.message}`,
      }); // Bad Gateway for upstream issues
    } else if (error.message.includes("User with userID")) {
      res.status(404).json({ message: error.message });
    } else {
      res
        .status(500)
        .json({ message: `Internal server error: ${error.message}` });
    }
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch a user by userID
export const getUserByUserID = async (req, res) => {
  try {
    const { userID } = req.params; // Extract userID from request parameters
    const user = await User.findOne({ userID }); // Find user by userID
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, req.body);
    if (!user) {
      console.log("Product not found");
    }
    const updatedUser = await User.findById(id);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a user by userID
export const updateUserByUserID = async (req, res) => {
  try {
    const { userID } = req.params; // Extract userID from request parameters
    const user = await User.findOneAndUpdate({ userID }, req.body, {
      new: true,
    }); // Update user by userID
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({ message: "User not found " });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
