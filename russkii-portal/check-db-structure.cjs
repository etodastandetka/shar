const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  const db = new Database(dbPath);

  console.log('🔍 Проверка структуры базы данных...\n');

  // Проверяем структуру таблицы users
  console.log('📋 Структура таблицы users:');
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  if (userColumns.length === 0) {
    console.log('❌ Таблица users не найдена');
  } else {
    userColumns.forEach(col => {
      console.log(`  ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
  }

  // Проверяем структуру таблицы pending_registrations
  console.log('\n📋 Структура таблицы pending_registrations:');
  const pendingColumns = db.prepare("PRAGMA table_info(pending_registrations)").all();
  if (pendingColumns.length === 0) {
    console.log('❌ Таблица pending_registrations не найдена');
  } else {
    pendingColumns.forEach(col => {
      console.log(`  ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
  }

  // Показываем все таблицы
  console.log('\n📊 Все таблицы в базе данных:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(table => {
    console.log(`  📁 ${table.name}`);
  });

  // Проверяем несколько записей из users
  console.log('\n👤 Пример записей из таблицы users:');
  try {
    const users = db.prepare('SELECT * FROM users LIMIT 3').all();
    if (users.length === 0) {
      console.log('❌ Нет пользователей в таблице');
    } else {
      users.forEach((user, index) => {
        console.log(`\n  Пользователь ${index + 1}:`);
        Object.keys(user).forEach(key => {
          console.log(`    ${key}: ${user[key]}`);
        });
      });
    }
  } catch (error) {
    console.log('❌ Ошибка при чтении users:', error.message);
  }

} catch (error) {
  console.error('❌ Ошибка:', error);
} 