const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
console.log(`📁 Путь к базе данных: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

console.log('🔍 Проверяем pending_registrations...');

db.all(`
  SELECT * FROM pending_registrations 
  WHERE phone LIKE '+7992%' 
  ORDER BY created_at DESC 
  LIMIT 10
`, (err, rows) => {
  if (err) {
    console.error('❌ Ошибка:', err);
  } else {
    console.log('📋 Записи в pending_registrations:');
    if (rows.length === 0) {
      console.log('❌ Записей нет - бот их удалил!');
    } else {
      rows.forEach((reg, index) => {
        console.log(`${index + 1}. Телефон: ${reg.phone}`);
        console.log(`   🔑 Токен: ${reg.verification_token}`);
        console.log(`   ✅ Верифицирован: ${reg.verified ? 'Да' : 'Нет'}`);
        console.log(`   📧 Email: ${JSON.parse(reg.user_data).email}`);
        console.log(`   📅 Создан: ${reg.created_at}`);
        console.log('   ---');
      });
    }
  }
  
  db.close();
}); 