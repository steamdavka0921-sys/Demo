// ... (өмнөх callTelegram, callFirestore функцууд хэвээрээ)

      else if (data.startsWith("paid_")) {
        const [_, gId, tCode] = data.split("_");
        
        // GIF илгээж, message_id-г хадгалах (дараа нь устгахын тулд)
        const sentLoading = await callTelegram('sendAnimation', { 
          chat_id: chatId, 
          animation: LOADING_GIF, 
          caption: "✅ Шалгаж байна. Түр хүлээнэ үү." 
        });

        const nowTs = Date.now();
        // loading_id-г Firestore-д хадгалснаар админ шийдвэр гаргахад устгах боломжтой болно
        await callFirestore('PATCH', `/requests/${gId}?updateMask.fieldPaths=createdAt&updateMask.fieldPaths=loadingId`, {
          fields: { 
            createdAt: { stringValue: nowTs.toString() },
            loadingId: { stringValue: sentLoading.result.message_id.toString() }
          }
        });
        
        await callTelegram('sendMessage', { 
          chat_id: ADMIN_ID, 
          text: `🔔 ЦЭНЭГЛЭХ ХҮСЭЛТ!\n🆔 ID: ${gId}\n📍 Код: ${tCode}\n👤 User: @${cb.from.username || 'unknown'}`,
          reply_markup: { inline_keyboard: [[{ text: "✅ Зөвшөөрөх", callback_data: `adm_ok_dep_${chatId}_${gId}` }, { text: "❌ Татгалзах", callback_data: `adm_no_dep_${chatId}_${gId}` }]] }
        });
      }
      else if (data.startsWith("adm_")) {
        const [_, status, type, userId, targetId] = data.split("_");
        const isApprove = status === "ok";
        const res = await callFirestore('GET', `/requests/${targetId}`);
        
        // GIF-ийг устгах хэсэг
        if (res.fields && res.fields.loadingId) {
          await callTelegram('deleteMessage', { chat_id: userId, message_id: res.fields.loadingId.stringValue });
        }

        const createdAtStr = (res.fields && res.fields.createdAt) ? res.fields.createdAt.stringValue : null;
        let isExpired = false;
        if (createdAtStr) {
          const diffSec = (Date.now() - parseInt(createdAtStr)) / 1000;
          if (diffSec > 120) isExpired = true; 
        }

        if (isApprove && isExpired) {
          await callTelegram('sendMessage', { chat_id: userId, text: "Уучлаарай гүйлгээний хугацаа дууссан байна. @Eegiimn-тэй холбогдоно уу." });
          await callTelegram('editMessageText', { chat_id: ADMIN_ID, message_id: cb.message.message_id, text: `⚠️ ХУГАЦАА ХЭТЭРСЭН:\nID: ${targetId}` });
        } else {
          const finalStatus = isApprove ? "✅ ЗӨВШӨӨРӨГДӨВ" : "❌ ТАТГАЛЗАВ";
          const userMsg = isApprove ? `Танны ${targetId} ID амжилттай цэнэглэгдлээ.` : "Уучлаарай, таны гүйлгээг цуцаллаа. @Eegiimn-тэй холбогдоно уу.";
          await callTelegram('sendMessage', { chat_id: userId, text: userMsg });
          await callTelegram('editMessageText', { chat_id: ADMIN_ID, message_id: cb.message.message_id, text: `🏁 ШИЙДВЭРЛЭГДЭВ:\nID: ${targetId}\nТөлөв: ${finalStatus}` });
        }
      }

// ... (Deposit мессеж илгээх хэсэгт)
      else if (!isNaN(text.replace(/\s/g, '')) && text.length >= 7 && text.length < 15) {
        // ... (trxCode үүсгэх хэсэг хэвээрээ)
        
        const depositMsg = `🏦 Данс: MN370050099105952353\n🏦 MONPAY: ДАВААСҮРЭН\n\n📌 Утга: ${trxCode}\n\n⚠️ ГҮЙЛГЭЭНИЙ УТГАА ЗААВАЛ БИЧНЭ ҮҮ!\nДоод дүн 1,000₮\nДээд дүн 100,000₮\n\nГҮЙЛГЭЭ ХИЙСЭН ТОХИОЛДОЛД ДООРХ ТӨЛБӨР ТӨЛСӨН ГЭХ ТОВЧ ДЭЭР ДАРНА ҮҮ\n👇👇👇`;

        await callTelegram('sendMessage', {
          chat_id: chatId, 
          text: depositMsg,
          reply_markup: { inline_keyboard: [[{ text: "✅ Төлбөр төлсөн", callback_data: `paid_${gameId}_${trxCode}` }]] }
        });

        // Дансны дугаарыг тусад нь илгээх (Хэрэглэгч хуулж авахад хялбар)
        await callTelegram('sendMessage', {
          chat_id: chatId,
          text: `370050099105952353`
        });
      }
