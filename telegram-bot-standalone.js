import { startTelegramBot } from "./dist/server/telegram-bot-telegraf.js";

console.log("🚀 Запускаю Telegram бота...");

startTelegramBot()
  .then(() => {
    console.log("✅ Telegram бот запущен успешно");
  })
  .catch((error) => {
    console.error("❌ Ошибка запуска бота:", error);
    process.exit(1);
  });
