const { startTelegramBot } = require('./dist/server/telegram-bot-telegraf.js');

console.log('🚀 Запуск Telegram бота для верификации номеров телефонов...');

startTelegramBot()
  .then(() => {
    console.log('✅ Telegram бот успешно запущен!');
    console.log('📱 Бот готов принимать запросы на верификацию номеров телефонов');
  })
  .catch((error) => {
    console.error('❌ Ошибка при запуске Telegram бота:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка Telegram бота...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка Telegram бота...');
  process.exit(0);
});
