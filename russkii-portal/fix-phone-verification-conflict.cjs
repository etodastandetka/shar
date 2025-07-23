const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔧 Исправление конфликта верификации телефона');
console.log('📁 Путь к базе данных:', DB_PATH);

const USER_EMAIL = 'admin@primeballoons.ru';
const USER_PHONE = '+79920793424';

function fixPhoneVerificationConflict() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
  });

  console.log(`\n🔍 Проверяем пользователя: ${USER_EMAIL}`);

  // Проверяем статус пользователя
  db.get('SELECT * FROM users WHERE email = ?', [USER_EMAIL], (err, user) => {
    if (err) {
      console.error('❌ Ошибка поиска пользователя:', err.message);
      db.close();
      return;
    }

    if (!user) {
      console.log(`❌ Пользователь ${USER_EMAIL} не найден`);
      db.close();
      return;
    }

    console.log(`👤 Пользователь найден: ${user.email}`);
    console.log(`📞 Телефон: ${user.phone}`);
    console.log(`✅ Верифицирован: ${user.phone_verified ? 'ДА' : 'НЕТ'}`);

    if (user.phone_verified) {
      // Пользователь уже верифицирован, удаляем конфликтующие записи из pending_registrations
      console.log(`\n🧹 Пользователь уже верифицирован. Очищаем pending_registrations...`);
      
      db.run('DELETE FROM pending_registrations WHERE phone = ?', [user.phone], function(err) {
        if (err) {
          console.error('❌ Ошибка удаления из pending_registrations:', err.message);
        } else {
          console.log(`✅ Удалено ${this.changes} записей из pending_registrations для телефона ${user.phone}`);
        }
        
        // Также удаляем токен верификации, если он есть
        if (user.phone_verification_token) {
          db.run('UPDATE users SET phone_verification_token = NULL WHERE id = ?', [user.id], function(err2) {
            if (err2) {
              console.error('❌ Ошибка очистки токена:', err2.message);
            } else {
              console.log('✅ Токен верификации очищен');
            }
            
            console.log('\n🎉 Конфликт исправлен! Проверьте сайт.');
            db.close();
          });
        } else {
          console.log('\n🎉 Конфликт исправлен! Проверьте сайт.');
          db.close();
        }
      });
    } else {
      console.log('\n❌ Пользователь не верифицирован. Требуется повторная верификация.');
      db.close();
    }
  });
}

// Запускаем исправление
fixPhoneVerificationConflict(); 