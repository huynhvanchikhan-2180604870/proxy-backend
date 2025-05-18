import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes.js";
import ipRoutes from "./routes/ip.routes.js"; // Thêm routes mới
import proxyRoutes from "./routes/proxy.routes.js";
import userRoutes from "./routes/user.routes.js";

// Load env vars
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Proxy server is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ip", ipRoutes); // Thêm routes mới

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
