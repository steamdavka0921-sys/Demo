const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 200, body: "OK" };

  const TOKEN = process.env.BOT_TOKEN;
  const ADMIN_ID = process.env.ADMIN_CHAT_ID;
  const FIREBASE_ID = process.env.FIREBASE_PROJECT_ID;
  const API_KEY = process.env.FIREBASE_API_KEY; 
  const BOT_USERNAME = "Eegiidemobot";
  const BONUS_RATE = 0.03;

  const callTelegram = async (method, params) => {
    const data = JSON.stringify(params);
    const options = {
      hostname: 'api.telegram.org', port: 443, path: `/bot${TOKEN}/${method}`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    return new Promise((resolve) => {
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
    const options = {
      hostname: 'firestore.googleapis.com', port: 443,
      path: `/v1/projects/${FIREBASE_ID}/databases/(default)/documents${path}?key=${API_KEY}`,
      method: method,
      headers: data ? { 'Content-Type': 'application/json' } : {}
    };
    return new Promise((resolve) => {
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
    const cb = update.callback_query;
    const chatId = msg ? msg.chat.id : (cb ? cb.message.chat.id : null);

    if (cb) {
      const data = cb.data;
      if (data === "menu_deposit") {
        await callTelegram('sendMessage', { chat_id: chatId, text: "💰 Та цэнэглэх MELBET ID-гаа бичнэ үү:" });
      } 
      else if (data === "menu_invite") {
        const userRes = await callFirestore('GET', `/users/${chatId}`);
        const bonus = userRes.fields?.bonusBalance?.doubleValue || 0;
        await callTelegram('sendMessage', {
          chat_id: chatId,
          text: `🎁 *УРИЛГЫН СИСТЕМ*\n\nЛинк: https://t.me/${BOT_USERNAME}?start=${chatId}\n\n💰 Таны бонус: ${bonus}₮\n\n_Бонус татах бол админ руу @Eegiimn холбогдоно уу._`,
          parse_mode: "Markdown"
        });
      }
      await callTelegram('answerCallbackQuery', { callback_query_id: cb.id });
    }

    if (msg && msg.text) {
      const text = msg.text.trim();

      // Start logic
      if (text.startsWith("/start")) {
        const parts = text.split(" ");
        if (parts.length > 1 && parts[1] !== chatId.toString()) {
          await callFirestore('PATCH', `/users/${chatId}?updateMask.fieldPaths=invitedBy`, {
            fields: { invitedBy: { stringValue: parts[1] } }
          });
        }
        await callTelegram('sendMessage', {
          chat_id: chatId,
          text: "Сайн байна уу? EEGII AUTOMAT 24/7",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💰 Цэнэглэх", callback_data: "menu_deposit" }, { text: "💳 Татах", callback_data: "menu_withdraw" }],
              [{ text: "🎁 Найзаа урих / Бонус", callback_data: "menu_invite" }]
            ]
          }
        });
      }
      // ID input detection
      else if (/^\d+$/.test(text) && text.length >= 7 && text.length <= 10) {
        const trxCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        await callTelegram('sendMessage', {
          chat_id: chatId,
          text: `🏦 Данс: MN370050099105952353\n🏦 MONPAY: ДАВААСҮРЭН\n\n📌 Утга: ${trxCode}\n\n⚠️ УТГАА ЗААВАЛ БИЧНЭ ҮҮ!`,
          reply_markup: { inline_keyboard: [[{ text: "✅ Төлбөр төлсөн", callback_data: `paid_${text}_${trxCode}` }]] }
        });
      }
    }
  } catch (e) { console.error(e); }
  return { statusCode: 200, body: "OK" };
};
