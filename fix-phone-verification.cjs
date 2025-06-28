const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');
const PHONE = '+79920793424';

console.log('🔧 Исправление верификации телефона');
console.log('📁 База данных:', DB_PATH);
console.log('📞 Телефон:', PHONE);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
    return;
  }
});

// Сначала найдем все записи для этого номера
db.all(
  'SELECT * FROM pending_registrations WHERE phone = ?',
  [PHONE],
  (err, rows) => {
    if (err) {
      console.error('❌ Ошибка поиска записей:', err.message);
      db.close();
      return;
    }

    if (rows.length === 0) {
      console.log('❌ Записи для номера не найдены в pending_registrations');
      db.close();
      return;
    }

    console.log(`📋 Найдено записей: ${rows.length}`);
    
    rows.forEach((row, index) => {
      console.log(`\n   ${index + 1}. ID: ${row.id}`);
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

    // Обновляем все записи для этого номера как верифицированные
    db.run(
      'UPDATE pending_registrations SET verified = 1 WHERE phone = ?',
      [PHONE],
      function(err2) {
        if (err2) {
          console.error('❌ Ошибка обновления:', err2.message);
        } else {
          console.log(`\n✅ Обновлено записей: ${this.changes}`);
          console.log('🎉 Теперь сайт должен видеть телефон как подтвержденный!');
          console.log('\n💡 Попробуйте:');
          console.log('   1. Обновить страницу на сайте (F5)');
          console.log('   2. Нажать "Я подтвердил номер" в модальном окне');
        }
        db.close();
      }
    );
  }
); 