const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

// Ваш email для удаления
const EMAIL_TO_DELETE = 'etodastandetka@gmail.com';

console.log('🗑️ Быстрое удаление пользователя');
console.log('📁 База данных:', DB_PATH);
console.log('📧 Email для удаления:', EMAIL_TO_DELETE);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения:', err.message);
    return;
  }
  
  console.log('✅ Подключение к базе данных успешно');
  
  // Сначала показываем пользователя
  db.get('SELECT * FROM users WHERE email = ?', [EMAIL_TO_DELETE], (err, user) => {
    if (err) {
      console.error('❌ Ошибка поиска:', err.message);
      db.close();
      return;
    }
    
    if (!user) {
      console.log(`❌ Пользователь с email ${EMAIL_TO_DELETE} не найден`);
      db.close();
      return;
    }
    
    console.log('\n👤 Найден пользователь:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Телефон: ${user.phone || 'не указан'}`);
    console.log(`   Telegram: ${user.telegram_chat_id || 'не связан'}`);
    console.log(`   Верифицирован: ${user.phone_verified ? 'Да' : 'Нет'}`);
    
    // Удаляем пользователя
    db.run('DELETE FROM users WHERE email = ?', [EMAIL_TO_DELETE], function(err) {
      if (err) {
        console.error('❌ Ошибка удаления:', err.message);
      } else if (this.changes > 0) {
        console.log(`\n✅ Пользователь ${EMAIL_TO_DELETE} удален успешно!`);
        console.log('🎉 Теперь можете заново тестировать регистрацию');
      } else {
        console.log(`❌ Не удалось удалить пользователя ${EMAIL_TO_DELETE}`);
      }
      db.close();
    });
  });
}); 