const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');
const TOKEN = 'jemniawnsydzmyi7ceufma';

console.log('📋 Проверка pending_registrations для токена:', TOKEN);
console.log('📁 База данных:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
    return;
  }
});

db.get(
  'SELECT * FROM pending_registrations WHERE verification_token = ?',
  [TOKEN],
  (err, row) => {
    if (err) {
      console.error('❌ Ошибка поиска:', err.message);
    } else if (row) {
      console.log('\n✅ Запись найдена:');
      console.log(`   ID: ${row.id}`);
      console.log(`   Телефон: ${row.phone}`);
      console.log(`   Токен: ${row.verification_token}`);
      console.log(`   Верифицирован: ${row.verified ? 'ДА' : 'НЕТ'}`);
      console.log(`   Создан: ${row.created_at}`);
      try {
        const userData = JSON.parse(row.user_data);
        console.log(`   Email из user_data: ${userData.email}`);
      } catch (e) {
        console.log(`   User data: ${row.user_data}`);
      }
    } else {
      console.log('❌ Запись с токеном не найдена в pending_registrations');
    }
    
    // Также проверим все записи для этого email
    db.all(
      `SELECT pr.*, 
       (SELECT email FROM users WHERE phone = pr.phone) as email_from_users
       FROM pending_registrations pr 
       WHERE pr.user_data LIKE '%etodastandetka@gmail.com%'`,
      [],
      (err2, rows) => {
        if (err2) {
          console.error('❌ Ошибка поиска по email:', err2.message);
        } else if (rows && rows.length > 0) {
          console.log(`\n📋 Все записи для email etodastandetka@gmail.com (${rows.length}):`);
          rows.forEach((row, index) => {
            console.log(`\n   ${index + 1}. ID: ${row.id}`);
            console.log(`      Телефон: ${row.phone}`);
            console.log(`      Токен: ${row.verification_token}`);
            console.log(`      Верифицирован: ${row.verified ? 'ДА' : 'НЕТ'}`);
            console.log(`      Создан: ${row.created_at}`);
          });
        } else {
          console.log('\n❌ Записи для email etodastandetka@gmail.com не найдены');
        }
        db.close();
      }
    );
  }
); 