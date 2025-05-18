import express from "express";
import {
  addIpToDatabase,
  checkIpInDatabase,
} from "../controllers/ip.controller.js";
import { checkActive, protect } from "../middleware/auth.js";

const router = express.Router();

// Cả hai endpoints đều yêu cầu authentication và tài khoản active
router.get("/check/:ip", protect, checkActive, checkIpInDatabase);
router.get("/add/:ip", protect, checkActive, addIpToDatabase);

export default router;
