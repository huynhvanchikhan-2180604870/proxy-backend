import axios from "axios";
import cors from "cors";
import express from "express";
import { HttpsProxyAgent } from "https-proxy-agent";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Proxy server is running");
});

// Rotate IP via Proxyno1, dynamic key
app.get("/change-ip", async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ message: "Missing key" });

  try {
    const apiUrl = `https://app.proxyno1.com/api/change-key-ip/${encodeURIComponent(
      key
    )}`;
    const { data } = await axios.get(apiUrl);
    return res.json(data);
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.response?.data?.message || err.message });
  }
});

// Fetch IP via any HTTP(S) proxy supplied in query
// proxy=domain:port:user:pass
app.get("/get-ip", async (req, res) => {
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
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
