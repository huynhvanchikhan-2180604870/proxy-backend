// @desc    Get all users
// @route   GET /api/users

import User from "../models/user.model.js";

// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Activate/deactivate user
// @route   PUT /api/users/:id/activate
// @access  Private/Admin
const toggleUserActivation = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.active = !user.active;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      active: user.active,
      message: `User ${user.active ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export { getUsers, toggleUserActivation };
