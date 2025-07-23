const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');
const EMAIL = 'etodastandetka@gmail.com';
const PHONE = '+79920793424';

console.log('🧹 Очистка pending_registrations');
console.log('📁 База данных:', DB_PATH);
console.log('📧 Email:', EMAIL);
console.log('📞 Телефон:', PHONE);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
    return;
  }
});

// Сначала покажем что есть
console.log('\n🔍 Поиск записей...');

db.all(
  `SELECT * FROM pending_registrations 
   WHERE phone = ? OR user_data LIKE ?`,
  [PHONE, `%${EMAIL}%`],
  (err, rows) => {
    if (err) {
      console.error('❌ Ошибка поиска:', err.message);
      db.close();
      return;
    }

    if (rows.length === 0) {
      console.log('✅ Записи не найдены');
      db.close();
      return;
    }

    console.log(`📋 Найдено записей: ${rows.length}`);
    
    rows.forEach((row, index) => {
      console.log(`\n   ${index + 1}. ID: ${row.id}`);
      console.log(`      Телефон: ${row.phone}`);
      console.log(`      Токен: ${row.verification_token}`);
      console.log(`      Верифицирован: ${row.verified ? 'ДА' : 'НЕТ'}`);
      console.log(`      Создан: ${row.created_at}`);
      
      try {
        const userData = JSON.parse(row.user_data);
        console.log(`      Email: ${userData.email}`);
      } catch (e) {
        console.log(`      User data: ${row.user_data}`);
      }
    });

    // Удаляем все записи
    console.log('\n🗑️ Удаление записей...');
    
    db.run(
      `DELETE FROM pending_registrations 
       WHERE phone = ? OR user_data LIKE ?`,
      [PHONE, `%${EMAIL}%`],
      function(err2) {
        if (err2) {
          console.error('❌ Ошибка удаления:', err2.message);
        } else {
          console.log(`✅ Удалено записей: ${this.changes}`);
          console.log('🎉 Теперь можно заново регистрироваться!');
        }
        db.close();
      }
    );
  }
); 