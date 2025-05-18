import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, username, password, proxyno1UserKey } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Fetch proxy API key from Proxyno1
    let proxyApiKey = "";
    try {
      const { data } = await axios.get(
        `https://app.proxyno1.com/api/all-keys/${proxyno1UserKey}?options=showall`
      );

      if (data.status === 0 && data.data && data.data.length > 0) {
        // Get the first active key
        const activeKey = data.data.find(
          (key) => key.status === "Đang sử dụng"
        );
        if (activeKey) {
          proxyApiKey = activeKey.key;
        }
      } else {
        return res.status(400).json({ message: "Invalid Proxyno1 user key" });
      }
    } catch (error) {
      return res
        .status(400)
        .json({ message: "Failed to validate Proxyno1 user key" });
    }

    // Create user
    const user = await User.create({
      name,
      username,
      password,
      proxyno1UserKey,
      proxyApiKey,
      active: false, // Default to inactive
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        proxyno1UserKey: user.proxyno1UserKey,
        active: user.active,
        message: "Registration successful. Please wait for account activation.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check for user
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({ message: "Account not activated yet" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      active: user.active,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        proxyno1UserKey: user.proxyno1UserKey,
        active: user.active,
        proxyApiKey: user.proxyApiKey,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export { getUserProfile, loginUser, registerUser };
