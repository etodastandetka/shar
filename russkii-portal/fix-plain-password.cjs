const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Функция хеширования как в auth-sqlite.ts
function hashPassword(password) {
  const saltRounds = 10;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

try {
  // Подключение к базе данных
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  const db = new Database(dbPath);

  console.log('🔍 Поиск пользователей с нехешированными паролями...');
  
  // Получаем всех пользователей
  const users = db.prepare('SELECT id, email, password FROM users').all();
  
  let fixedCount = 0;
  
  for (const user of users) {
    // Проверяем, является ли пароль нехешированным (не содержит ':')
    if (!user.password.includes(':')) {
      console.log(`🔒 Исправляем пароль для ${user.email}`);
      
      // Хешируем пароль
      const hashedPassword = hashPassword(user.password);
      
      // Обновляем в базе данных
      const result = db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?')
        .run(hashedPassword, new Date().toISOString(), user.id);
      
      if (result.changes > 0) {
        console.log(`✅ Пароль для ${user.email} успешно захеширован`);
        fixedCount++;
      } else {
        console.log(`❌ Не удалось обновить пароль для ${user.email}`);
      }
    }
  }
  
  console.log(`\n📊 Результат:`);
  console.log(`   Всего пользователей: ${users.length}`);
  console.log(`   Исправлено паролей: ${fixedCount}`);
  
  if (fixedCount > 0) {
    console.log('\n✅ Все пароли теперь корректно захешированы!');
    console.log('🔄 Перезапустите сервер: pm2 restart russkii-portal');
  } else {
    console.log('\n✅ Все пароли уже были корректно захешированы');
  }

} catch (error) {
  console.error('❌ Ошибка:', error);
  process.exit(1);
} 