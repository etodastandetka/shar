const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const ADMIN_EMAIL = 'fortnite08qwer@gmail.com';
const ADMIN_PASSWORD = 'Plmokn09';

// Функция хеширования пароля (как в auth-sqlite.ts)
function hashPassword(password) {
  const saltRounds = 10;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Функция проверки пароля
function comparePasswords(hashedPassword, inputPassword) {
  try {
    const [salt, hash] = hashedPassword.split(':');
    const inputHash = crypto.pbkdf2Sync(inputPassword, salt, 1000, 64, 'sha512').toString('hex');
    return hash === inputHash;
  } catch (error) {
    console.error('Ошибка при проверке пароля:', error);
    return false;
  }
}

try {
  // Подключение к базе данных
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  const db = new Database(dbPath);

  console.log('🔍 Проверка пользователя администратора...');
  
  // Получаем пользователя
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(ADMIN_EMAIL);
  
  if (!user) {
    console.log('❌ Пользователь не найден!');
    process.exit(1);
  }
  
  console.log('✅ Пользователь найден:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Full Name: ${user.full_name}`);
  console.log(`   Is Admin: ${user.is_admin}`);
  console.log(`   Password Hash: ${user.password?.substring(0, 50)}...`);
  
  // Проверяем текущий пароль
  console.log('\n🔐 Проверка пароля...');
  const isPasswordValid = comparePasswords(user.password, ADMIN_PASSWORD);
  console.log(`   Пароль "${ADMIN_PASSWORD}" валиден: ${isPasswordValid}`);
  
  if (!isPasswordValid) {
    console.log('\n🔧 Исправление пароля...');
    
    // Создаем новый хеш пароля
    const newHashedPassword = hashPassword(ADMIN_PASSWORD);
    console.log(`   Новый хеш: ${newHashedPassword.substring(0, 50)}...`);
    
    // Обновляем пароль в базе
    const result = db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE email = ?')
      .run(newHashedPassword, new Date().toISOString(), ADMIN_EMAIL);
    
    if (result.changes > 0) {
      console.log('✅ Пароль успешно обновлен!');
      
      // Проверяем снова
      const updatedUser = db.prepare('SELECT password FROM users WHERE email = ?').get(ADMIN_EMAIL);
      const isNewPasswordValid = comparePasswords(updatedUser.password, ADMIN_PASSWORD);
      console.log(`   Проверка нового пароля: ${isNewPasswordValid}`);
    } else {
      console.log('❌ Не удалось обновить пароль');
    }
  }
  
  // Проверяем админские права
  console.log('\n👑 Проверка прав администратора...');
  if (user.is_admin === 1) {
    console.log('✅ Права администратора подтверждены');
  } else {
    console.log('🔧 Установка прав администратора...');
    const result = db.prepare('UPDATE users SET is_admin = 1, updated_at = ? WHERE email = ?')
      .run(new Date().toISOString(), ADMIN_EMAIL);
    
    if (result.changes > 0) {
      console.log('✅ Права администратора установлены!');
    } else {
      console.log('❌ Не удалось установить права администратора');
    }
  }
  
  console.log('\n🎯 Итоговые данные для входа:');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('\n✅ Проверка завершена! Попробуйте войти в систему.');

} catch (error) {
  console.error('❌ Ошибка:', error);
  process.exit(1);
} 