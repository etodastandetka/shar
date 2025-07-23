const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔍 ДИАГНОСТИКА PHONE VERIFICATION');
console.log('=================================');

// 1. Проверяем все pending registrations
console.log('\n📋 Все pending registrations:');
const pendingRegs = db.prepare('SELECT * FROM pending_registrations ORDER BY created_at DESC').all();
pendingRegs.forEach((reg, index) => {
  console.log(`${index + 1}. ID: ${reg.id}`);
  console.log(`   Phone: ${reg.phone}`);
  console.log(`   Token: ${reg.verification_token}`);
  console.log(`   Verified: ${reg.verified ? 'YES' : 'NO'}`);
  console.log(`   Created: ${reg.created_at}`);
  
  try {
    const userData = JSON.parse(reg.user_data);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Name: ${userData.fullName}`);
  } catch (e) {
    console.log(`   User Data: ${reg.user_data.substring(0, 50)}...`);
  }
  console.log('');
});

// 2. Функция для очистки старых записей
function cleanOldPendingRegistrations() {
  console.log('🧹 Очистка старых pending registrations...');
  
  // Удаляем записи старше 1 часа
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result = db.prepare('DELETE FROM pending_registrations WHERE created_at < ?').run(oneHourAgo);
  
  console.log(`✅ Удалено ${result.changes} старых записей`);
}

// 3. Функция для очистки неподтвержденных записей для конкретного телефона
function cleanUnverifiedForPhone(phone) {
  console.log(`🧹 Очистка неподтвержденных записей для телефона: ${phone}`);
  
  const result = db.prepare('DELETE FROM pending_registrations WHERE phone = ? AND verified = 0').run(phone);
  
  console.log(`✅ Удалено ${result.changes} неподтвержденных записей`);
}

// 4. Проверяем, есть ли уже пользователь с таким телефоном
function checkExistingUser(phone) {
  console.log(`👤 Проверка существующего пользователя с телефоном: ${phone}`);
  
  const user = db.prepare('SELECT id, email, full_name, phone_verified FROM users WHERE phone = ?').get(phone);
  
  if (user) {
    console.log(`✅ Пользователь найден:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   Phone verified: ${user.phone_verified ? 'YES' : 'NO'}`);
    return user;
  } else {
    console.log(`❌ Пользователь с телефоном ${phone} не найден`);
    return null;
  }
}

// Выполняем диагностику
if (pendingRegs.length > 0) {
  console.log('\n🔧 РЕКОМЕНДАЦИИ:');
  
  // Проверяем каждую запись
  pendingRegs.forEach((reg) => {
    console.log(`\n📱 Для телефона ${reg.phone}:`);
    
    // Проверяем, есть ли уже пользователь
    const existingUser = checkExistingUser(reg.phone);
    
    if (existingUser) {
      console.log('   💡 РЕКОМЕНДАЦИЯ: Удалить pending registration, пользователь уже существует');
      console.log(`   🔗 Для входа: используйте email ${existingUser.email}`);
    } else {
      console.log('   💡 РЕКОМЕНДАЦИЯ: Можно продолжить верификацию');
      console.log(`   🔗 Telegram ссылка: https://t.me/InvittingToTGbotik_bot?start=${reg.verification_token}`);
    }
  });
  
  console.log('\n🛠️ КОМАНДЫ ДЛЯ ИСПРАВЛЕНИЯ:');
  console.log('1. Очистить старые записи (старше 1 часа): node -e "require(\'./debug-phone-verification.cjs\').cleanOld()"');
  console.log('2. Очистить неподтвержденные для телефона: node -e "require(\'./debug-phone-verification.cjs\').cleanPhone(\'+79920793424\')"');
} else {
  console.log('✅ Нет pending registrations');
}

// Экспорт функций для использования из командной строки
module.exports = {
  cleanOld: cleanOldPendingRegistrations,
  cleanPhone: cleanUnverifiedForPhone,
  checkUser: checkExistingUser
}; 