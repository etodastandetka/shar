const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Запуск улучшенного Telegram бота...');
console.log('🔑 Токен встроен в код бота');

// Запускаем бота с помощью ts-node
const command = 'npx ts-node server/telegram-bot-final.ts';

console.log(`📝 Выполняем команду: ${command}`);

const botProcess = exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Ошибка выполнения: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`⚠️ Предупреждения: ${stderr}`);
  }
  console.log(`📄 Вывод: ${stdout}`);
});

// Выводим логи в реальном времени
botProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

botProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

botProcess.on('close', (code) => {
  console.log(`🔚 Процесс завершился с кодом ${code}`);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка бота...');
  botProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка бота...');
  botProcess.kill('SIGTERM');
  process.exit(0);
});

console.log('✅ Бот запускается...'); 