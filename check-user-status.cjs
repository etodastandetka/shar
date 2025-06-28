const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');
const EMAIL = 'etodastandetka@gmail.com';

console.log('📋 Проверка статуса пользователя:', EMAIL);
console.log('📁 База данных:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
    return;
  }
});

db.get(
  'SELECT id, email, phone, phone_verified, phone_verification_token, telegram_chat_id, created_at, updated_at FROM users WHERE email = ?',
  [EMAIL],
  (err, user) => {
    if (err) {
      console.error('❌ Ошибка поиска:', err.message);
    } else if (user) {
      console.log('\n✅ Пользователь найден:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Телефон: ${user.phone || 'не указан'}`);
      console.log(`   Телефон верифицирован: ${user.phone_verified ? 'ДА' : 'НЕТ'}`);
      console.log(`   Токен верификации: ${user.phone_verification_token || 'отсутствует'}`);
      console.log(`   Telegram ID: ${user.telegram_chat_id || 'не связан'}`);
      console.log(`   Создан: ${user.created_at}`);
      console.log(`   Обновлен: ${user.updated_at}`);
    } else {
      console.log('❌ Пользователь не найден');
    }
    
    // Также проверяем pending_registrations
    db.get(
      'SELECT * FROM pending_registrations WHERE verification_token IS NOT NULL ORDER BY created_at DESC LIMIT 1',
      [],
      (err2, pending) => {
        if (err2) {
          console.error('❌ Ошибка поиска в pending_registrations:', err2.message);
        } else if (pending) {
          console.log('\n📋 Последняя запись в pending_registrations:');
          console.log(`   Телефон: ${pending.phone}`);
          console.log(`   Токен: ${pending.verification_token}`);
          console.log(`   Верифицирован: ${pending.verified ? 'ДА' : 'НЕТ'}`);
          console.log(`   Создан: ${pending.created_at}`);
          try {
            const userData = JSON.parse(pending.user_data);
            console.log(`   Email: ${userData.email}`);
          } catch (e) {
            console.log(`   User data: ${pending.user_data}`);
          }
        }
        db.close();
      }
    );
  }
); 