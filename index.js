const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const app = express();
app.use(cors());
app.use(express.json());

// 👉 public folder serve করবে
app.use(express.static("public"));

let sock;

// WhatsApp socket init
async function initWhatsApp() {
  const authDir = path.join(__dirname, "auth_info");

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const reason =
        lastDisconnect?.error?.output?.statusCode;

      if (reason !== DisconnectReason.loggedOut) {
        initWhatsApp();
      }
    }
  });
}

initWhatsApp();

// 👉 Pairing API
app.post("/pair", async (req, res) => {
  try {
    const { number } = req.body;

    if (!number) {
      return res.json({
        success: false,
        error: "Number missing"
      });
    }

    const cleanNumber = number.replace(/[^0-9]/g, "");

    if (!sock) {
      return res.json({
        success: false,
        error: "WhatsApp not ready"
      });
    }

    const code = await sock.requestPairingCode(cleanNumber);

    res.json({
      success: true,
      code
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message
    });
  }
});

// Root check
app.get("/", (req, res) => {
  res.send("LovlyBoy Pairing Server Running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
