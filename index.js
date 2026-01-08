const express = require("express");
const cors = require("cors");
const path = require("path");

const {
  default: makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let sock;
let isReady = false;

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (u) => {
    if (u.connection === "open") {
      isReady = true;
      console.log("✅ WhatsApp socket ready");
    }
    if (u.connection === "close") {
      isReady = false;
      startWhatsApp();
    }
  });
}

startWhatsApp();

// 🔥 Pair endpoint (FIXED)
app.post("/pair", async (req, res) => {
  try {
    if (!isReady) {
      return res.json({
        success: false,
        error: "WhatsApp not ready, wait 10–15 sec",
      });
    }

    const number = req.body.number;
    if (!number) {
      return res.json({ success: false, error: "Number required" });
    }

    const clean = number.replace(/\D/g, "");
    const code = await sock.requestPairingCode(clean);

    res.json({ success: true, code });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.get("/", (_, res) => {
  res.send("LovlyBoy Pair Server Running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("Server running on " + PORT)
);
