const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🗑️ Быстрое удаление пользователя');
console.log('📁 Путь к базе данных:', DB_PATH);

// ИЗМЕНИТЕ НА СВОЙ EMAIL
const USER_EMAIL = 'etodastandetka@gmail.com'; // Замените на ваш email

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

    // Удаляем пользователя из users
    db.run('DELETE FROM users WHERE email = ?', [email], function(err) {
      if (err) {
        console.error('❌ Ошибка удаления из users:', err.message);
        db.close();
        return;
      } 
      
      const userDeleted = this.changes > 0;
      console.log(`${userDeleted ? '✅' : '❌'} Пользователь из users: ${userDeleted ? 'удален' : 'не найден'}`);
      
      // Также удаляем из pending_registrations
      db.run(
        `DELETE FROM pending_registrations WHERE user_data LIKE ? OR phone = ?`, 
        [`%${email}%`, user.phone || ''],
        function(err2) {
          if (err2) {
            console.error('❌ Ошибка удаления из pending_registrations:', err2.message);
          } else {
            console.log(`✅ Удалено из pending_registrations: ${this.changes} записей`);
          }
          
          if (userDeleted) {
            console.log('🎉 Полная очистка завершена! Теперь можете заново регистрироваться');
          }
          db.close();
        }
      );
    });
  });
}

// Запускаем удаление
deleteUserByEmail(USER_EMAIL); 