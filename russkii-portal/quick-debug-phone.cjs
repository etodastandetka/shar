const Database = require('better-sqlite3');
const path = require('path');

console.log('🚀 БЫСТРАЯ ДИАГНОСТИКА PHONE VERIFICATION');
console.log('==========================================');

try {
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  const db = new Database(dbPath);
  
  // 1. Показываем все pending registrations
  console.log('\n📋 Все pending registrations:');
  const pending = db.prepare('SELECT * FROM pending_registrations ORDER BY created_at DESC').all();
  
  if (pending.length === 0) {
    console.log('❌ Нет pending registrations!');
    console.log('💡 Это значит что либо:');
    console.log('   - Запрос на регистрацию не создается');
    console.log('   - Записи удаляются сразу после создания');
    console.log('   - Проблема с savePendingRegistration функцией');
  } else {
    pending.forEach((record, index) => {
      console.log(`\n${index + 1}. Запись ID: ${record.id}`);
      console.log(`   📱 Phone: "${record.phone}"`);
      console.log(`   🔑 Token: "${record.verification_token}"`);
      console.log(`   ✅ Verified: ${record.verified ? 'YES' : 'NO'}`);
      console.log(`   📅 Created: ${record.created_at}`);
      
      // Парсим user_data
      try {
        const userData = JSON.parse(record.user_data);
        console.log(`   👤 Email: ${userData.email}`);
        console.log(`   📧 Name: ${userData.fullName || userData.firstName + ' ' + userData.lastName}`);
      } catch (e) {
        console.log(`   📄 User Data: ${record.user_data.substring(0, 100)}...`);
      }
    });
  }
  
  // 2. Проверяем последние логи сервера
  console.log('\n📊 РЕКОМЕНДАЦИИ:');
  
  if (pending.length === 0) {
    console.log('1. 🔍 Проверьте логи сервера: pm2 logs russkii-portal --lines 50');
    console.log('2. 🔄 Попробуйте создать новую регистрацию на сайте');
    console.log('3. 🛠️ Убедитесь что сервер собран с последними изменениями');
  } else {
    console.log('1. 📱 Используйте этот токен в Telegram боте:');
    const latestRecord = pending[0];
    console.log(`   https://t.me/InvittingToTGbotik_bot?start=${latestRecord.verification_token}`);
    console.log('2. 📞 Отправьте этот номер боту:');
    console.log(`   ${latestRecord.phone}`);
    console.log('3. 📋 Проверьте логи после отправки: pm2 logs russkii-portal --lines 20');
  }
  
  console.log('\n🔧 КОМАНДЫ ДЛЯ ИСПРАВЛЕНИЯ:');
  console.log('- Очистить pending: node -e "const db=require(\'better-sqlite3\')(\'./db/database.sqlite\'); console.log(\'Удалено:\', db.prepare(\'DELETE FROM pending_registrations WHERE verified=0\').run().changes);"');
  console.log('- Пересобрать: pm2 stop russkii-portal && npm run build && pm2 start russkii-portal');
  console.log('- Проверить токен вручную: node test-phone-verification.cjs');
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
} 