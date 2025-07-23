const Database = require('better-sqlite3');
const { join } = require('path');

console.log('🔍 Проверка структуры таблицы products...');

// Подключение к базе данных
const dbPath = join(process.cwd(), 'db', 'database.sqlite');
const db = new Database(dbPath);

try {
  // Получаем структуру таблицы
  console.log('\n📋 Структура таблицы products:');
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  
  tableInfo.forEach(column => {
    console.log(`  - ${column.name}: ${column.type}${column.dflt_value ? ` (default: ${column.dflt_value})` : ''}`);
  });
  
  // Проверяем есть ли поле is_discounted
  const hasDiscountedField = tableInfo.some(column => column.name === 'is_discounted');
  
  if (hasDiscountedField) {
    console.log('\n✅ Поле "is_discounted" найдено в таблице');
    
    // Проверяем есть ли товары с установленным флагом уценки
    const discountedProducts = db.prepare("SELECT id, name, is_discounted FROM products WHERE is_discounted = 1").all();
    console.log(`\n📊 Товаров с флагом уценки: ${discountedProducts.length}`);
    
    if (discountedProducts.length > 0) {
      console.log('Товары со скидкой:');
      discountedProducts.forEach(product => {
        console.log(`  - ID: ${product.id}, Название: ${product.name}`);
      });
    }
    
    // Проверяем последний товар
    const lastProduct = db.prepare("SELECT * FROM products ORDER BY id DESC LIMIT 1").get();
    if (lastProduct) {
      console.log(`\n🔬 Последний товар (ID: ${lastProduct.id}):`);
      console.log(`  - is_discounted: ${lastProduct.is_discounted}`);
      console.log(`  - is_hot_deal: ${lastProduct.is_hot_deal}`);
      console.log(`  - is_bestseller: ${lastProduct.is_bestseller}`);
      console.log(`  - is_new_arrival: ${lastProduct.is_new_arrival}`);
      console.log(`  - is_limited_edition: ${lastProduct.is_limited_edition}`);
    }
    
  } else {
    console.log('\n❌ Поле "is_discounted" НЕ найдено в таблице!');
  }
  
} catch (error) {
  console.error('❌ Ошибка при проверке:', error);
} finally {
  db.close();
} 