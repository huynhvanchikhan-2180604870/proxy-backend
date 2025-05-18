import express from "express";
import { changeIp, getIp } from "../controllers/proxy.controller.js";
import { checkActive, protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/change-ip", protect, checkActive, changeIp);
router.get("/get-ip", protect, checkActive, getIp);

export default router;
