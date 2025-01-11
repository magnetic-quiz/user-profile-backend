import { Router } from "express";
const router = Router();
import {
  getAllUsers,
  getUserByUserID,
  createUser,
  updateUserByUserID,
  deleteUser,
} from "../controllers/user.controller.js";

router.get("/", getAllUsers);
router.get("/:userID", getUserByUserID);
router.post("/", createUser);
router.put("/:userID", updateUserByUserID);
router.delete("/:id", deleteUser);

export default router;
