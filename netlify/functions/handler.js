
const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 200, body: "OK" };

  // TOKEN-Г ШУУД ЭНД БИЧИЖ ӨГӨВ (Алдаа гаргахгүй тулд)
  const TOKEN = "8583114783:AAGplzC1zwz31YADtbAVYIfB_JjxgOQs614";
  const ADMIN_ID = process.env.ADMIN_CHAT_ID;
  const FIREBASE_ID = process.env.FIREBASE_PROJECT_ID;
  const API_KEY = process.env.FIREBASE_API_KEY;
  const BOT_USERNAME = "Eegiidemobot";
  const BONUS_RATE = 0.03;

  const callTelegram = async (method, params) => {
    const data = JSON.stringify(params);
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.telegram.org', port: 443, path: `/bot${TOKEN}/${method}`, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      };
      const req = https.request(options, (res) => {
        let resBody = '';
        res.on('data', (d) => resBody += d);
        res.on('end', () => resolve(JSON.parse(resBody || '{}')));
      });
      req.write(data);
      req.end();
    });
  };

  const callFirestore = async (method, path, body = null) => {
    const data = body ? JSON.stringify(body) : null;
    return new Promise((resolve) => {
      const options = {
        hostname: 'firestore.googleapis.com', port: 443,
        path: `/v1/projects/${FIREBASE_ID}/databases/(default)/documents${path}?key=${API_KEY}`,
        method: method,
        headers: data ? { 'Content-Type': 'application/json' } : {}
      };
      const req = https.request(options, (res) => {
        let resBody = '';
        res.on('data', (d) => resBody += d);
        res.on('end', () => { try { resolve(JSON.parse(resBody)); } catch (e) { resolve({}); } });
      });
      if (data) req.write(data);
      req.end();
    });
  };

  try {
    const update = JSON.parse(event.body);
    const msg = update.message;
    if (msg && msg.text) {
      const chatId = msg.chat.id;
      const text = msg.text.trim();

      if (text.startsWith("/start")) {
        // Найзаа урих логик
        const parts = text.split(" ");
        if (parts.length > 1 && parts[1] !== chatId.toString()) {
          await callFirestore('PATCH', `/users/${chatId}?updateMask.fieldPaths=invitedBy`, {
            fields: { invitedBy: { stringValue: parts[1] } }
          });
        }

        await callTelegram('sendMessage', {
          chat_id: chatId,
          text: "Сайн байна уу? @Eegiidemobot 24/7 AUTOMAT",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💰 Цэнэглэх", callback_data: "menu_deposit" }, { text: "💳 Татах", callback_data: "menu_withdraw" }],
              [{ text: "🎁 Найзаа урих / Бонус", callback_data: "menu_invite" }]
            ]
          }
        });
      }
      // Бусад функцууд энд үргэлжилнэ...
    }
  } catch (err) {
    console.error("LOG ERROR:", err);
  }

  return { statusCode: 200, body: "OK" };
};
