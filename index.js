import express, { json } from "express";
import { connect } from "mongoose";
import userRoutes from "./routes/user.route.js";
import dotenv from "dotenv";
import cors from "cors"; // Import cors

dotenv.config();

const app = express();

// ✅ Configure CORS to allow only specific frontend domains
const allowedOrigins = [
  "https://quizflo.com",
  "https://www.quizflo.com",
  "https://quizflo-git-development-quizflos-projects.vercel.app/",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);

app.use(json());
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at port ${PORT}`);
    });
    console.log("✅ Database Connected!");
  })
  .catch((err) => console.error("❌ Database Connection Error:", err));
