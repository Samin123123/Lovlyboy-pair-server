const express = require("express");
const cors = require("cors");
const path = require("path");
const QRCode = require("qrcode");
const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");

const { state, saveCreds } = useSingleFileAuthState("./auth_info.json");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
});

sock.ev.on("creds.update", saveCreds);

// Root page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Generate pairing code
app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if(!number) return res.json({ success: false, error: "No number provided" });

  try {
    // Generate QR code image data
    const qrData = "https://wa.me/" + number; // উদাহরণ
    const qrImageUrl = await QRCode.toDataURL(qrData);

    // Generate a random section ID
    const sectionID = "LB-" + Math.floor(100000 + Math.random() * 900000);

    res.json({ success: true, code: qrImageUrl, section: sectionID });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
