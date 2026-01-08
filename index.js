const express = require("express");
const QRCode = require("qrcode");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 3000;

let latestQR = "WAITING_FOR_QR";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

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
      const reason =
        lastDisconnect?.error?.output?.statusCode;

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

app.get("/", async (req, res) => {
  if (latestQR === "WAITING_FOR_QR") {
    return res.send("⏳ QR generating, wait...");
  }

  const qrImage = await QRCode.toDataURL(latestQR);
  res.send(`
    <html>
      <head>
        <title>Lovlyboy QR</title>
      </head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;">
        <img src="${qrImage}" />
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("🌐 Server running on port", PORT);
});
