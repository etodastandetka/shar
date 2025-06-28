const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔗 Отвязка от Telegram бота');
console.log('📁 Путь к базе данных:', DB_PATH);

// ЗАМЕНИТЕ НА СВОЙ EMAIL
const USER_EMAIL = 'admin@primeballoons.ru'; // Ваш email

function unlinkTelegram(email) {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
  });

  // Сначала показываем пользователя
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('❌ Ошибка поиска пользователя:', err.message);
      db.close();
      return;
    }

    if (!user) {
      console.log(`❌ Пользователь с email ${email} не найден`);
      db.close();
      return;
    }

    console.log('👤 Найден пользователь:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Telegram: ${user.telegram_chat_id || 'не связан'}`);

    if (!user.telegram_chat_id) {
      console.log('❌ Telegram уже не связан с этим аккаунтом');
      db.close();
      return;
    }

    // Отвязываем Telegram
    db.run('UPDATE users SET telegram_chat_id = NULL WHERE email = ?', [email], function(err) {
      if (err) {
        console.error('❌ Ошибка отвязки:', err.message);
      } else if (this.changes > 0) {
        console.log(`✅ Telegram отвязан от аккаунта ${email}!`);
        console.log('🔄 Теперь можете заново привязать бота');
      } else {
        console.log(`❌ Не удалось отвязать Telegram`);
      }
      db.close();
    });
  });
}

// Запускаем отвязку
unlinkTelegram(USER_EMAIL); 