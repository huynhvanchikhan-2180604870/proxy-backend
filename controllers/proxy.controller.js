import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

// @desc    Change IP via Proxyno1
// @route   GET /api/proxy/change-ip
// @access  Private
const changeIp = async (req, res) => {
  try {
    const user = req.user;

    if (!user.proxyApiKey) {
      return res
        .status(400)
        .json({ message: "No proxy API key found for user" });
    }

    const apiUrl = `https://app.proxyno1.com/api/change-key-ip/${encodeURIComponent(
      user.proxyApiKey
    )}`;
    const { data } = await axios.get(apiUrl);
    return res.json(data);
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.response?.data?.message || err.message });
  }
};

// @desc    Get IP via supplied HTTP(S) proxy
// @route   GET /api/proxy/get-ip
// @access  Private
const getIp = async (req, res) => {
  const { proxy } = req.query;
  if (!proxy) return res.status(400).json({ message: "Missing proxy param" });

  try {
    // Build agent URL: http://user:pass@domain:port
    const agent = new HttpsProxyAgent("http://" + proxy);
    const { data } = await axios.get("https://api.ipify.org?format=json", {
      httpsAgent: agent,
      timeout: 5000,
    });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export { changeIp, getIp };
