const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔍 Проверка пользователей и их Telegram chat ID...\n');

// Проверяем структуру таблицы users
console.log('📋 Структура таблицы users:');
const tableInfo = db.prepare("PRAGMA table_info(users)").all();
console.table(tableInfo);

console.log('\n👥 Пользователи с телефоном +79920793424:');
const users = db.prepare("SELECT id, email, phone, telegram_chat_id FROM users WHERE phone = ?").all('+79920793424');
console.table(users);

console.log('\n👥 Все пользователи:');
const allUsers = db.prepare("SELECT id, email, phone, telegram_chat_id FROM users").all();
console.table(allUsers);

// Добавляем столбец telegram_chat_id если его нет
try {
  db.exec('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT');
  console.log('\n✅ Столбец telegram_chat_id добавлен');
} catch (error) {
  console.log('\n📋 Столбец telegram_chat_id уже существует');
}

// Устанавливаем telegram_chat_id для пользователя с номером +79920793424
console.log('\n🔧 Обновляем telegram_chat_id для пользователя...');
const updateResult = db.prepare('UPDATE users SET telegram_chat_id = ? WHERE phone = ?').run('6826609528', '+79920793424');
console.log(`Обновлено записей: ${updateResult.changes}`);

// Проверяем результат
console.log('\n✅ Проверяем обновленные данные:');
const updatedUsers = db.prepare("SELECT id, email, phone, telegram_chat_id FROM users WHERE phone = ?").all('+79920793424');
console.table(updatedUsers);

db.close(); 