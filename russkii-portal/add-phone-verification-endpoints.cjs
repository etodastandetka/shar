const fs = require('fs');
const path = require('path');

const routesFile = path.join(__dirname, 'server', 'routes-sqlite.ts');

// Читаем содержимое файла
let content = fs.readFileSync(routesFile, 'utf8');

// Проверяем, есть ли уже эндпоинты
if (content.includes('/api/auth/request-phone-verification')) {
  console.log('✅ Эндпоинты верификации телефона уже существуют');
  process.exit(0);
}

// Находим место для вставки (после импортов)
const importMatch = content.match(/import[\s\S]*?from ['"]\.[^'"]*['"];?\n/g);
if (!importMatch) {
  console.error('❌ Не удалось найти секцию импортов');
  process.exit(1);
}

// Добавляем недостающие импорты
const phoneVerificationImport = `import { 
  savePendingRegistration, 
  checkPhoneVerification, 
  markPhoneAsVerified,
  getPendingRegistrationData,
  removePendingRegistration 
} from "./phone-verification";
import { handleTelegramUpdate } from "./telegram-bot";`;

// Проверяем, есть ли уже импорты
if (!content.includes('from "./phone-verification"')) {
  const lastImportIndex = content.lastIndexOf('import ');
  const nextLineIndex = content.indexOf('\n', lastImportIndex) + 1;
  content = content.slice(0, nextLineIndex) + phoneVerificationImport + '\n' + content.slice(nextLineIndex);
}

// Эндпоинты для добавления
const endpoints = `
// Phone verification endpoints
app.post("/api/auth/request-phone-verification", async (req, res) => {
  try {
    const { phone, userData, verificationToken } = req.body;
    
    if (!phone || !userData || !verificationToken) {
      return res.status(400).json({ 
        error: "Отсутствуют обязательные поля: phone, userData, verificationToken" 
      });
    }

    // Сохраняем данные для верификации
    const saved = await savePendingRegistration(phone, userData, verificationToken);
    
    if (saved) {
      res.json({ 
        success: true, 
        message: "Данные сохранены, ожидается подтверждение телефона",
        verificationToken 
      });
    } else {
      res.status(500).json({ error: "Ошибка при сохранении данных" });
    }
  } catch (error) {
    console.error("Ошибка при сохранении данных верификации:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

app.post("/api/auth/check-phone-verification", async (req, res) => {
  try {
    const { phone, verificationToken } = req.body;
    
    if (!phone || !verificationToken) {
      return res.status(400).json({ 
        error: "Отсутствуют обязательные поля: phone, verificationToken" 
      });
    }

    // Проверяем статус верификации
    const isVerified = await checkPhoneVerification(phone, verificationToken);
    
    if (isVerified) {
      // Получаем данные пользователя
      const userData = await getPendingRegistrationData(phone, verificationToken);
      
      if (userData) {
        // Удаляем временные данные
        await removePendingRegistration(phone, verificationToken);
        
        res.json({ 
          verified: true,
          userData: userData,
          message: "Телефон подтвержден" 
        });
      } else {
        res.json({ 
          verified: false, 
          message: "Данные пользователя не найдены" 
        });
      }
    } else {
      res.json({ 
        verified: false,
        message: "Телефон не подтвержден"
      });
    }
  } catch (error) {
    console.error("Ошибка при проверке верификации:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Telegram webhook endpoint
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    const update = req.body;
    
    // Обрабатываем обновление от Telegram
    await handleTelegramUpdate(update);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Ошибка при обработке Telegram webhook:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Endpoint для подтверждения телефона через Telegram
app.post("/api/telegram/verify-phone", async (req, res) => {
  try {
    const { phone, verificationToken } = req.body;
    
    if (!phone || !verificationToken) {
      return res.status(400).json({ 
        error: "Отсутствуют обязательные поля: phone, verificationToken" 
      });
    }

    // Помечаем телефон как подтвержденный
    const verified = await markPhoneAsVerified(phone, verificationToken);
    
    if (verified) {
      res.json({ 
        success: true, 
        message: "Телефон успешно подтвержден" 
      });
    } else {
      res.status(500).json({ error: "Ошибка при подтверждении телефона" });
    }
  } catch (error) {
    console.error("Ошибка при подтверждении телефона:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});
`;

// Находим место для вставки эндпоинтов (перед экспортом или в конце файла)
const insertPosition = content.lastIndexOf('export default app;') || content.length;

// Вставляем эндпоинты
content = content.slice(0, insertPosition) + endpoints + '\n' + content.slice(insertPosition);

// Записываем обновленный файл
fs.writeFileSync(routesFile, content, 'utf8');

console.log('✅ Эндпоинты верификации телефона успешно добавлены!');
console.log('📱 Теперь система поддерживает:');
console.log('   - Сохранение данных регистрации с токеном');
console.log('   - Проверку подтверждения телефона');
console.log('   - Telegram webhook для обработки сообщений');
console.log('   - API для подтверждения телефона через бота');
console.log('');
console.log('🔧 Не забудьте:');
console.log('   1. Создать Telegram бота через @BotFather');
console.log('   2. Добавить TELEGRAM_BOT_TOKEN в .env файл');
console.log('   3. Настроить webhook для продакшена'); 