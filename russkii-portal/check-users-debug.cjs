const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
console.log(`📁 Путь к базе данных: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверяем пользователей...');

db.all(`
  SELECT id, email, phone, phone_verified, telegram_chat_id, created_at 
  FROM users 
  WHERE phone LIKE '+7992%' OR email LIKE '%etoda%' OR email LIKE '%petya%'
  ORDER BY created_at DESC 
  LIMIT 10
`, (err, rows) => {
  if (err) {
    console.error('❌ Ошибка:', err);
  } else {
    console.log('👤 Найденные пользователи:');
    rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   📞 Телефон: ${user.phone}`);
      console.log(`   ✅ Верифицирован: ${user.phone_verified ? 'Да' : 'Нет'}`);
      console.log(`   💬 Telegram: ${user.telegram_chat_id || 'Не привязан'}`);
      console.log(`   📅 Создан: ${user.created_at}`);
      console.log('   ---');
    });
    
    if (rows.length === 0) {
      console.log('❌ Пользователи не найдены');
    }
  }
  
  db.close();
}); 