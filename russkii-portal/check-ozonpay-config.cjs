#!/usr/bin/env node

console.log('🔧 ПРОВЕРКА КОНФИГУРАЦИИ OZON PAY');
console.log('='.repeat(50));

// Проверяем переменные окружения
console.log('\n📋 ТЕКУЩИЕ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
console.log(`ACCESS_KEY: ${process.env.OZONPAY_ACCESS_KEY ? '✅ Установлен (' + process.env.OZONPAY_ACCESS_KEY.substring(0, 8) + '...)' : '❌ НЕ ЗАДАН'}`);
console.log(`SECRET_KEY: ${process.env.OZONPAY_SECRET_KEY ? '✅ Установлен (' + process.env.OZONPAY_SECRET_KEY.substring(0, 8) + '...)' : '❌ НЕ ЗАДАН'}`);
console.log(`NOTIFICATION_SECRET_KEY: ${process.env.OZONPAY_NOTIFICATION_SECRET_KEY ? '✅ Установлен (' + process.env.OZONPAY_NOTIFICATION_SECRET_KEY.substring(0, 8) + '...)' : '❌ НЕ ЗАДАН'}`);
console.log(`API_URL: ${process.env.OZONPAY_API_URL || '🔧 По умолчанию: https://payapi.ozon.ru/v1'}`);

console.log('\n🌐 URL НАСТРОЙКИ:');
console.log(`SUCCESS_URL: ${process.env.OZONPAY_SUCCESS_URL || '🔧 По умолчанию: https://helens-jungle.ru/payment/success'}`);
console.log(`FAIL_URL: ${process.env.OZONPAY_FAIL_URL || '🔧 По умолчанию: https://helens-jungle.ru/payment/fail'}`);
console.log(`WEBHOOK_URL: ${process.env.OZONPAY_WEBHOOK_URL || '🔧 По умолчанию: https://helens-jungle.ru/api/ozonpay/webhook'}`);

// Проверяем наличие всех необходимых ключей
const missingKeys = [];
if (!process.env.OZONPAY_ACCESS_KEY) missingKeys.push('OZONPAY_ACCESS_KEY');
if (!process.env.OZONPAY_SECRET_KEY) missingKeys.push('OZONPAY_SECRET_KEY');
if (!process.env.OZONPAY_NOTIFICATION_SECRET_KEY) missingKeys.push('OZONPAY_NOTIFICATION_SECRET_KEY');

if (missingKeys.length > 0) {
  console.log('\n❌ ОТСУТСТВУЮТ ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ:');
  missingKeys.forEach(key => console.log(`   - ${key}`));
  
  console.log('\n📝 НАСТРОЙКА ПРОДАКШН CREDENTIALS:');
  console.log('Получите новые продакшн ключи из личного кабинета Ozon Pay и добавьте в ecosystem.config.cjs:');
  console.log('');
  console.log('env: {');
  console.log('  // ... другие переменные ...');
  console.log('  OZONPAY_ACCESS_KEY: "your_production_access_key",');
  console.log('  OZONPAY_SECRET_KEY: "your_production_secret_key",');
  console.log('  OZONPAY_NOTIFICATION_SECRET_KEY: "your_production_notification_secret",');
  console.log('  OZONPAY_API_URL: "https://payapi.ozon.ru/v1",');
  console.log('}');
  console.log('');
  console.log('Затем перезапустите сервер: pm2 restart russkii-portal');
} else {
  console.log('\n✅ ВСЕ ОБЯЗАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ УСТАНОВЛЕНЫ');
  
  // Проверяем что ключи не являются старыми тестовыми
  const oldTestKey = 'f3c0b7c9-9d17-4aa7-94b2-7106649534c3';
  if (process.env.OZONPAY_ACCESS_KEY === oldTestKey) {
    console.log('\n⚠️  ВНИМАНИЕ: Используется старый тестовый ACCESS_KEY!');
    console.log('Обновите на продакшн ключ из личного кабинета Ozon Pay');
  } else {
    console.log('\n🎉 КОНФИГУРАЦИЯ ГОТОВА К ИСПОЛЬЗОВАНИЮ');
  }
}

console.log('\n' + '='.repeat(50)); 