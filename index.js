const express = require("express");
const cors = require("cors");
const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const Pino = require("pino");
const QRCode = require("qrcode");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // public folder serve

// WhatsApp auth
const { state, saveCreds } = useSingleFileAuthState("./auth_info.json");
let sock;

async function startSock() {
  sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) QRCode.toDataURL(qr).then(url => currentQR = url);
    if (connection === "close") console.log("Connection closed:", lastDisconnect.error);
  });
}

startSock();

// Store current QR
let currentQR = "";

// Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.post("/pair", async (req, res) => {
  const { number } = req.body;
  if (!number) return res.json({ success: false, error: "No number provided" });

  // Generate simple section ID
  const sectionID = "LB-" + Math.floor(Math.random() * 900000 + 100000); 
  res.json({ success: true, code: sectionID, qr: currentQR });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
