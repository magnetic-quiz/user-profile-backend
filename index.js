import express, { json } from "express";
import { connect } from "mongoose";
import userRoutes from "./routes/user.route.js";

const app = express();
app.use(json());
app.use("/api/users", userRoutes);

connect(
  "mongodb+srv://magneticquiz:zvD1mjrOcyyagiwd@magneticcluster.ad5u1.mongodb.net/userbase?retryWrites=true&w=majority&appName=magneticCluster"
).then(() => {
  app.listen(5001, () => {
    console.log("server running at port 5001");
  });
  console.log("Database Connected!");
});
