const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔧 Исправление telegram_chat_id для пользователя...\n');

// Сначала добавляем столбец telegram_chat_id если его нет
try {
  db.exec('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT');
  console.log('✅ Столбец telegram_chat_id добавлен');
} catch (error) {
  console.log('📋 Столбец telegram_chat_id уже существует');
}

// Проверяем текущее состояние
console.log('\n📋 Текущие данные пользователя:');
const currentUser = db.prepare("SELECT id, email, phone, telegram_chat_id FROM users WHERE phone = ?").get('+79920793424');
console.log(currentUser);

// Устанавливаем telegram_chat_id = 6826609528 для пользователя с номером +79920793424
console.log('\n🔧 Устанавливаем telegram_chat_id...');
const updateResult = db.prepare('UPDATE users SET telegram_chat_id = ? WHERE phone = ?').run('6826609528', '+79920793424');
console.log(`Обновлено записей: ${updateResult.changes}`);

// Проверяем результат
console.log('\n✅ Обновленные данные пользователя:');
const updatedUser = db.prepare("SELECT id, email, phone, telegram_chat_id FROM users WHERE phone = ?").get('+79920793424');
console.log(updatedUser);

// Проверяем, что можем найти пользователя по telegram_chat_id
console.log('\n🔍 Проверяем поиск по telegram_chat_id:');
const foundUser = db.prepare("SELECT id, email, phone, telegram_chat_id FROM users WHERE telegram_chat_id = ?").get('6826609528');
console.log(foundUser);

db.close();
console.log('\n🎉 Готово! Теперь уведомления должны работать.'); 