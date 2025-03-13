import express, { json } from "express";
import { connect } from "mongoose";
import userRoutes from "./routes/user.route.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(json());
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

connect(MONGO_URI).then(() => {
  app.listen(PORT, () => {
    console.log("server running at port 5001");
  });
  console.log("Database Connected!");
});
