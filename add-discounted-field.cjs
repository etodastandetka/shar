const Database = require('better-sqlite3');
const { join } = require('path');

console.log('🏷️ Добавление поля "is_discounted" в таблицу products...');

// Подключение к базе данных
const dbPath = join(process.cwd(), 'db', 'database.sqlite');
const db = new Database(dbPath);

try {
  // Проверяем существует ли уже поле
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  const hasDiscountedField = tableInfo.some(column => column.name === 'is_discounted');
  
  if (hasDiscountedField) {
    console.log('✅ Поле "is_discounted" уже существует в таблице products');
    process.exit(0);
  }
  
  // Добавляем поле is_discounted
  console.log('➕ Добавляем поле "is_discounted" в таблицу products...');
  db.exec('ALTER TABLE products ADD COLUMN is_discounted BOOLEAN DEFAULT FALSE');
  
  console.log('✅ Поле "is_discounted" успешно добавлено!');
  
  // Также добавляем недостающие поля для флажков если их нет
  const flagFields = [
    { name: 'is_hot_deal', sql: 'ALTER TABLE products ADD COLUMN is_hot_deal BOOLEAN DEFAULT FALSE' },
    { name: 'is_bestseller', sql: 'ALTER TABLE products ADD COLUMN is_bestseller BOOLEAN DEFAULT FALSE' },
    { name: 'is_new_arrival', sql: 'ALTER TABLE products ADD COLUMN is_new_arrival BOOLEAN DEFAULT FALSE' },
    { name: 'is_limited_edition', sql: 'ALTER TABLE products ADD COLUMN is_limited_edition BOOLEAN DEFAULT FALSE' }
  ];
  
  for (const field of flagFields) {
    const hasField = tableInfo.some(column => column.name === field.name);
    if (!hasField) {
      console.log(`➕ Добавляем поле "${field.name}"...`);
      db.exec(field.sql);
      console.log(`✅ Поле "${field.name}" добавлено!`);
    }
  }
  
  // Показываем обновленную структуру таблицы
  console.log('\\n📋 Обновленная структура таблицы products:');
  const updatedTableInfo = db.prepare("PRAGMA table_info(products)").all();
  updatedTableInfo.forEach(column => {
    console.log(`  - ${column.name}: ${column.type}`);
  });
  
  console.log('\\n🎉 Миграция завершена успешно!');
  
} catch (error) {
  console.error('❌ Ошибка при добавлении поля:', error);
  process.exit(1);
} finally {
  db.close();
} 