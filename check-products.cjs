const Database = require('better-sqlite3');
const path = require('path');

// Подключаемся к базе данных
const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('=== ПРОВЕРКА КАТЕГОРИЙ В БАЗЕ ДАННЫХ ===\n');

try {
  // Получаем все уникальные категории
  console.log('📂 Категории в БД:');
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
  categories.forEach(row => {
    console.log(`  - ${row.category}`);
  });

  console.log('\n📊 Товары по категориям:');
  const categoryCounts = db.prepare('SELECT category, COUNT(*) as count FROM products WHERE category IS NOT NULL GROUP BY category ORDER BY category').all();
  categoryCounts.forEach(row => {
    console.log(`  ${row.category}: ${row.count} товаров`);
  });

  console.log('\n🔍 Примеры товаров по категориям:');
  categories.forEach(categoryRow => {
    const products = db.prepare('SELECT id, name, category FROM products WHERE category = ? LIMIT 3').all(categoryRow.category);
    console.log(`\n  ${categoryRow.category}:`);
    products.forEach(product => {
      console.log(`    - [${product.id}] ${product.name}`);
    });
  });

  console.log('\n✅ Проверка завершена');
} catch (error) {
  console.error('❌ Ошибка при проверке категорий:', error);
} finally {
  db.close();
} 