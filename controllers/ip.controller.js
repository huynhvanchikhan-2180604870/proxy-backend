import axios from "axios";

// @desc    Check IP in database
// @route   GET /api/ip/check/:ip
// @access  Private
export const checkIpInDatabase = async (req, res) => {
  try {
    const { ip } = req.params;

    if (!ip) {
      return res.status(400).json({ message: "IP không được cung cấp" });
    }

    const response = await axios.get(
      `https://bet.smsbet.top/check_ip.php?ip=${ip}`
    );
    return res.json(response.data);
  } catch (error) {
    console.error("Lỗi khi kiểm tra IP:", error);
    return res.status(500).json({
      message: "Không thể kiểm tra IP trong CSDL",
      error: error.message,
    });
  }
};

// @desc    Add IP to database
// @route   GET /api/ip/add/:ip
// @access  Private
export const addIpToDatabase = async (req, res) => {
  try {
    const { ip } = req.params;

    if (!ip) {
      return res.status(400).json({ message: "IP không được cung cấp" });
    }

    const response = await axios.get(
      `https://bet.smsbet.top/add_ip.php?ip=${ip}`
    );
    return res.json(response.data);
  } catch (error) {
    console.error("Lỗi khi thêm IP:", error);
    return res.status(500).json({
      message: "Không thể thêm IP vào CSDL",
      error: error.message,
    });
  }
};
