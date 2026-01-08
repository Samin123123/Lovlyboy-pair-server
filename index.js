const fs = require("fs");
const path = require("path");
const express = require("express");
const QRCode = require("qrcode");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let latestQR = "WAITING_FOR_QR";
let latestPairCode = "";
const ownerInfo = {
  name: "Samin (LovlyBoy)",
  email: "lovlyboy@example.com",
  note: "Owner of LovlyBoy WhatsApp Bot 💗"
};

// Start WhatsApp Bot
async function startBot() {
  const authPath = path.join("/tmp", "baileys-session");

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
        startBot();
      }
    }

    if (connection === "open") {
      console.log("🎉 WhatsApp Connected Successfully");
    }
  });
    }

startBot();

// Generate Pair Code (dummy for now)
app.post("/pair", (req, res) => {
  const { number } = req.body;
  if(!number) return res.json({ success: false, error: "Number required" });

  latestPairCode = Math.floor(100000 + Math.random()*900000).toString();
  return res.json({ success: true, code: latestPairCode });
});

// Serve HTML for QR + Owner Info
app.get("/", async (req, res) => {
  let qrImage = "";
  if(latestQR !== "WAITING_FOR_QR") qrImage = await QRCode.toDataURL(latestQR);

  res.send(`
  <html>
  <head>
    <title>💗 LovlyBoy WhatsApp Pairing 💗</title>
    <style>
      body { font-family:sans-serif; background: linear-gradient(to right,#ffecd2,#fcb69f); display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; }
      h1 { color:#ff4b2b; text-shadow:2px 2px #fff; }
      input, button { padding:12px 20px; font-size:16px; border-radius:10px; margin:5px; text-align:center; }
      button { cursor:pointer; background: linear-gradient(45deg,#ff4b2b,#ff416c); color:white; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.2); transition:0.2s; }
      button:hover { transform:translateY(-3px); box-shadow:0 10px 20px rgba(0,0,0,0.3); }
      #result { margin-top:20px; padding:12px; font-weight:bold; font-size:18px; color:#ff4b2b; background:rgba(255,255,255,0.8); border-radius:10px; width:300px; text-align:center; box-shadow:0 5px 15px rgba(0,0,0,0.1); word-break:break-all; }
      img { width:250px; height:250px; margin-top:15px; }
    </style>
  </head>
  <body>
    <h1>💗 LovlyBoy WhatsApp Pairing 💗</h1>
    <input type="text" id="number" placeholder="Enter WhatsApp Number" />
    <div>
      <button onclick="generatePair()">Pair Code</button>
      <button onclick="showQR()">QR Code</button>
      <button onclick="showOwner()">Owner Info</button>
    </div>
    <div id="result">Your info will appear here</div>

    <script>
      let latestPair = "";
      async function generatePair() {
        const number = document.getElementById('number').value.trim();
        const result = document.getElementById('result');
        if(!number) return result.innerText="❌ Enter number!";

        const res = await fetch('/pair', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({number}) });
        const data = await res.json();
        if(data.success) {
          latestPair = data.code;
          result.innerText = "✅ Your Pair Code: " + data.code;
        } else result.innerText = "❌ "+data.error;
      }

      function showQR() {
        const result = document.getElementById('result');
        if('${qrImage}' === '') return result.innerText="⏳ QR not ready yet!";
        result.innerHTML = '<img src="${qrImage}" />';
      }

      function showOwner() {
        const result = document.getElementById('result');
        result.innerHTML = "👑 Name: ${ownerInfo.name}<br/>📧 Email: ${ownerInfo.email}<br/>💬 Note: ${ownerInfo.note}";
      }
    </script>
  </body>
  </html>
  `);
});

app.listen(PORT, () => console.log("🌐 Server running on port", PORT));
