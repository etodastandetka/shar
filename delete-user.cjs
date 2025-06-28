const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🗑️ Быстрое удаление пользователя');
console.log('📁 Путь к базе данных:', DB_PATH);

// ИЗМЕНИТЕ НА СВОЙ EMAIL
const USER_EMAIL = 'admin@primeballoons.ru'; // Замените на ваш email

function deleteUserByEmail(email) { 
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
    console.log(`   Телефон: ${user.phone || 'не указан'}`);
    console.log(`   Telegram: ${user.telegram_chat_id || 'не связан'}`);
    console.log(`   Верифицирован: ${user.phone_verified ? 'Да' : 'Нет'}`);

    // Удаляем пользователя
    db.run('DELETE FROM users WHERE email = ?', [email], function(err) {
      if (err) {
        console.error('❌ Ошибка удаления:', err.message);
      } else if (this.changes > 0) {
        console.log(`✅ Пользователь ${email} удален успешно!`);
        console.log('🎉 Теперь можете заново тестировать регистрацию и бота');
      } else {
        console.log(`❌ Пользователь ${email} не был удален`);
      }
      db.close();
    });
  });
}

// Запускаем удаление
deleteUserByEmail(USER_EMAIL); 
