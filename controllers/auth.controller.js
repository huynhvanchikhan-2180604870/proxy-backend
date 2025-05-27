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

    // Fetch latest proxy API keys from Proxyno1 và update database
    try {
      const { data } = await axios.get(
        `https://app.proxyno1.com/api/all-keys/${user.proxyno1UserKey}?options=showall`
      );

      if (data.status === 0 && data.data && data.data.length > 0) {
        // Filter active keys và sort theo ngày hết hạn (xa nhất trước)
        const activeKeys = data.data.filter(
          (key) => key.status === "Đang sử dụng"
        );

        if (activeKeys.length > 0) {
          // Sort keys theo date_expired (xa nhất trước)
          const sortedKeys = activeKeys.sort((a, b) => {
            const dateA = new Date(a.date_expired);
            const dateB = new Date(b.date_expired);
            return dateB - dateA; // Descending order (xa nhất trước)
          });

          // Chọn key có hạn sử dụng lâu nhất
          const bestKey = sortedKeys[0];

          // Kiểm tra xem key có còn hạn không
          const currentDate = new Date();
          const keyExpiredDate = new Date(bestKey.date_expired);

          if (keyExpiredDate > currentDate) {
            // Key còn hạn - cập nhật key mới
            if (user.proxyApiKey !== bestKey.key) {
              await User.findByIdAndUpdate(user._id, {
                proxyApiKey: bestKey.key,
              });
              console.log(
                `Updated API key for user ${user.username}: ${bestKey.key} (expires: ${bestKey.date_expired})`
              );
            }
          } else {
            // Key đã hết hạn - lưu trạng thái hết hạn
            await User.findByIdAndUpdate(user._id, {
              proxyApiKey: "KEY_EXPIRED",
            });
            console.log(
              `User ${user.username} has expired key: ${bestKey.key} (expired: ${bestKey.date_expired})`
            );
          }
        } else {
          // Không có key nào đang hoạt động - kiểm tra có key hết hạn không
          const expiredKeys = data.data.filter(
            (key) => key.status !== "Đang sử dụng"
          );

          if (expiredKeys.length > 0) {
            // Có key nhưng đã hết hạn
            await User.findByIdAndUpdate(user._id, {
              proxyApiKey: "KEY_EXPIRED",
            });
            console.log(
              `User ${user.username} has no active keys but has expired keys`
            );
          } else {
            // Không có key nào cả
            await User.findByIdAndUpdate(user._id, {
              proxyApiKey: "NO_KEY_PURCHASED",
            });
            console.log(`User ${user.username} has no keys purchased`);
          }
        }
      } else {
        // API trả về lỗi hoặc không có data - có thể chưa mua key
        await User.findByIdAndUpdate(user._id, {
          proxyApiKey: "NO_KEY_PURCHASED",
        });
        console.log(
          `User ${user.username} - API returned error or no data, likely no keys purchased`
        );
      }
    } catch (keyFetchError) {
      // Log lỗi nhưng không ảnh hưởng đến quá trình đăng nhập
      console.error(
        `Error fetching keys for user ${user.username}:`,
        keyFetchError.message
      );

      // Nếu có lỗi kết nối, giữ nguyên key cũ hoặc đánh dấu lỗi
      if (!user.proxyApiKey || user.proxyApiKey === "") {
        await User.findByIdAndUpdate(user._id, {
          proxyApiKey: "API_ERROR",
        });
      }
    }

    // Response giữ nguyên format như cũ
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

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch latest proxy API keys from Proxyno1 và update database
    try {
      const { data } = await axios.get(
        `https://app.proxyno1.com/api/all-keys/${user.proxyno1UserKey}?options=showall`
      );

      if (data.status === 0 && data.data && data.data.length > 0) {
        // Filter active keys và sort theo ngày hết hạn (xa nhất trước)
        const activeKeys = data.data.filter(
          (key) => key.status === "Đang sử dụng"
        );

        if (activeKeys.length > 0) {
          // Sort keys theo date_expired (xa nhất trước)
          const sortedKeys = activeKeys.sort((a, b) => {
            const dateA = new Date(a.date_expired);
            const dateB = new Date(b.date_expired);
            return dateB - dateA; // Descending order (xa nhất trước)
          });

          // Chọn key có hạn sử dụng lâu nhất
          const bestKey = sortedKeys[0];

          // Kiểm tra xem key có còn hạn không
          const currentDate = new Date();
          const keyExpiredDate = new Date(bestKey.date_expired);

          if (keyExpiredDate > currentDate) {
            // Key còn hạn - cập nhật key mới
            if (user.proxyApiKey !== bestKey.key) {
              await User.findByIdAndUpdate(user._id, {
                proxyApiKey: bestKey.key,
              });
              console.log(
                `Updated API key for user ${user.username}: ${bestKey.key} (expires: ${bestKey.date_expired})`
              );
              // Cập nhật lại user object để trả về key mới
              user.proxyApiKey = bestKey.key;
            }
          } else {
            // Key đã hết hạn - lưu trạng thái hết hạn
            await User.findByIdAndUpdate(user._id, {
              proxyApiKey: "KEY_EXPIRED",
            });
            console.log(
              `User ${user.username} has expired key: ${bestKey.key} (expired: ${bestKey.date_expired})`
            );
            user.proxyApiKey = "KEY_EXPIRED";
          }
        } else {
          // Không có key nào đang hoạt động - kiểm tra có key hết hạn không
          const expiredKeys = data.data.filter(
            (key) => key.status !== "Đang sử dụng"
          );

          if (expiredKeys.length > 0) {
            // Có key nhưng đã hết hạn
            await User.findByIdAndUpdate(user._id, {
              proxyApiKey: "KEY_EXPIRED",
            });
            console.log(
              `User ${user.username} has no active keys but has expired keys`
            );
            user.proxyApiKey = "KEY_EXPIRED";
          } else {
            // Không có key nào cả
            await User.findByIdAndUpdate(user._id, {
              proxyApiKey: "NO_KEY_PURCHASED",
            });
            console.log(`User ${user.username} has no keys purchased`);
            user.proxyApiKey = "NO_KEY_PURCHASED";
          }
        }
      } else {
        // API trả về lỗi hoặc không có data - có thể chưa mua key
        await User.findByIdAndUpdate(user._id, {
          proxyApiKey: "NO_KEY_PURCHASED",
        });
        console.log(
          `User ${user.username} - API returned error or no data, likely no keys purchased`
        );
        user.proxyApiKey = "NO_KEY_PURCHASED";
      }
    } catch (keyFetchError) {
      // Log lỗi nhưng không ảnh hưởng đến việc lấy profile
      console.error(
        `Error fetching keys for user ${user.username}:`,
        keyFetchError.message
      );

      // Nếu có lỗi kết nối, giữ nguyên key cũ hoặc đánh dấu lỗi
      if (!user.proxyApiKey || user.proxyApiKey === "") {
        await User.findByIdAndUpdate(user._id, {
          proxyApiKey: "API_ERROR",
        });
        user.proxyApiKey = "API_ERROR";
      }
    }

    // Response trả về thông tin user với key đã cập nhật
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      proxyno1UserKey: user.proxyno1UserKey,
      active: user.active,
      proxyApiKey: user.proxyApiKey,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export { getUserProfile, loginUser, registerUser };
