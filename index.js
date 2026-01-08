const express = require("express");
const QRCode = require("qrcode");
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

const PORT = process.env.PORT || 3000;

let latestQR = "WAITING_FOR_QR";

/* ===============================
   WHATSAPP BOT START
================================ */
async function startBot() {
  // Render / Cloud safe path
  const authPath = path.join("/tmp", "baileys-session");

  // folder না থাকলে বানাবে
  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      latestQR = qr;
      console.log("✅ New QR generated");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        startBot();
      }
    }

    if (connection === "open") {
      console.log("🎉 WhatsApp Connected Successfully");
    }
  });
}

startBot();

/* ===============================
   WEB SERVER
================================ */

app.get("/", async (req, res) => {
  if (latestQR === "WAITING_FOR_QR") {
    return res.send(`
      <h2 style="text-align:center;margin-top:50px;">
        ⏳ QR তৈরি হচ্ছে… ৫–১০ সেকেন্ড অপেক্ষা কর
      </h2>
    `);
  }

  const qrImage = await QRCode.toDataURL(latestQR);

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>LovlyBoy WhatsApp Pair</title>
      <style>
        body {
          margin:0;
          height:100vh;
          display:flex;
          justify-content:center;
          align-items:center;
          background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);
          font-family:Arial;
        }
        .box {
          background:#ffffff10;
          padding:25px;
          border-radius:16px;
          box-shadow:0 0 40px #000;
          text-align:center;
          color:white;
        }
        img {
          width:260px;
          border-radius:12px;
          margin-top:15px;
          background:white;
          padding:10px;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>💗 LovlyBoy WhatsApp QR 💗</h2>
        <p>WhatsApp → Link a device → Scan QR</p>
        <img src="${qrImage}" />
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("🌐 Server running on port", PORT);
});
