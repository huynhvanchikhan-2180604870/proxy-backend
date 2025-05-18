import express from "express";
import {
  getUsers,
  toggleUserActivation,
} from "../controllers/user.controller.js";
import { checkActive, protect } from "../middleware/auth.js";

const router = express.Router();

// For now, anyone who's authenticated and active can manage users
// In a real app, you'd want admin middleware
router.get("/", protect, checkActive, getUsers);
router.put("/:id/activate", protect, checkActive, toggleUserActivation);

export default router;
