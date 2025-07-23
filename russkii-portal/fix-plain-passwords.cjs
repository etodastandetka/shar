const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Путь к базе данных
const dbPath = path.join(process.cwd(), 'db', 'database.sqlite');
const db = new Database(dbPath);

// Функция хеширования пароля
function hashPassword(password) {
  const saltRounds = 10;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Функция для проверки, является ли пароль открытым текстом
function isPlainTextPassword(password) {
  // Если пароль не содержит разделители ":", значит это открытый текст
  return !password.includes(':');
}

async function fixPlainPasswords() {
  console.log('🔐 ИСПРАВЛЕНИЕ ОТКРЫТЫХ ПАРОЛЕЙ В БАЗЕ ДАННЫХ\n');
  
  try {
    // Получаем всех пользователей
    const users = db.prepare('SELECT id, email, password FROM users').all();
    console.log(`📊 Найдено пользователей: ${users.length}\n`);
    
    let fixedCount = 0;
    let alreadyHashedCount = 0;
    
    for (const user of users) {
      console.log(`🔍 Проверяем пользователя: ${user.email}`);
      console.log(`   Пароль: ${user.password.substring(0, 10)}...`);
      
      if (isPlainTextPassword(user.password)) {
        console.log(`   ⚠️ НАЙДЕН ОТКРЫТЫЙ ПАРОЛЬ! Хешируем...`);
        
        // Хешируем пароль
        const hashedPassword = hashPassword(user.password);
        
        // Обновляем в базе данных
        const updateStmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
        const result = updateStmt.run(hashedPassword, user.id);
        
        if (result.changes > 0) {
          console.log(`   ✅ Пароль захеширован: ${hashedPassword.substring(0, 20)}...`);
          fixedCount++;
        } else {
          console.log(`   ❌ Ошибка при обновлении пароля`);
        }
      } else {
        console.log(`   ✅ Пароль уже захеширован`);
        alreadyHashedCount++;
      }
      console.log('');
    }
    
    console.log('📈 РЕЗУЛЬТАТЫ:');
    console.log(`   Пользователей всего: ${users.length}`);
    console.log(`   Паролей исправлено: ${fixedCount}`);
    console.log(`   Уже были захешированы: ${alreadyHashedCount}`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 Исправление завершено! Теперь все пароли захешированы.');
      console.log('🔄 Перезапустите сервер: pm2 restart russkii-portal');
    } else {
      console.log('\n✅ Все пароли уже были захешированы.');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении паролей:', error);
  } finally {
    db.close();
  }
}

// Запускаем исправление
fixPlainPasswords(); 