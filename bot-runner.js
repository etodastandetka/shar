require("ts-node/register");
const { startTelegramBot } = require("./server/telegram-bot-telegraf.ts");

console.log("🚀 Запускаю Telegram бота...");
startTelegramBot().catch(console.error);
