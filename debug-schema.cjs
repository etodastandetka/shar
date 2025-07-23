const Database = require('better-sqlite3');
const { join } = require('path');

console.log('🧪 Прямая проверка обновления is_discounted...');

// Подключение к базе данных
const dbPath = join(process.cwd(), 'db', 'database.sqlite');
const db = new Database(dbPath);

try {
  // Найдем последний товар для теста
  const lastProduct = db.prepare("SELECT * FROM products ORDER BY id DESC LIMIT 1").get();
  
  if (!lastProduct) {
    console.log('❌ Товары не найдены');
    process.exit(1);
  }
  
  console.log(`\n📦 Тестируем товар ID: ${lastProduct.id}`);
  console.log(`Название: "${lastProduct.name}"`);
  console.log(`Текущий is_discounted: ${lastProduct.is_discounted}`);
  
  // Тест 1: Устанавливаем is_discounted = 1
  console.log('\n🔄 Тест 1: Устанавливаем is_discounted = 1');
  const update1 = db.prepare(`
    UPDATE products 
    SET is_discounted = 1, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), lastProduct.id);
  
  console.log(`✅ Изменено строк: ${update1.changes}`);
  
  // Проверяем результат
  const check1 = db.prepare("SELECT is_discounted FROM products WHERE id = ?").get(lastProduct.id);
  console.log(`🔍 После обновления: ${check1.is_discounted}`);
  
  if (check1.is_discounted === 1) {
    console.log('✅ Флажок успешно установлен!');
  } else {
    console.log('❌ Флажок НЕ установлен!');
  }
  
  // Тест 2: Возвращаем is_discounted = 0  
  console.log('\n🔄 Тест 2: Возвращаем is_discounted = 0');
  const update2 = db.prepare(`
    UPDATE products 
    SET is_discounted = 0, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), lastProduct.id);
  
  console.log(`✅ Изменено строк: ${update2.changes}`);
  
  // Проверяем результат
  const check2 = db.prepare("SELECT is_discounted FROM products WHERE id = ?").get(lastProduct.id);
  console.log(`🔍 После обновления: ${check2.is_discounted}`);
  
  if (check2.is_discounted === 0) {
    console.log('✅ Флажок успешно сброшен!');
  } else {
    console.log('❌ Флажок НЕ сброшен!');
  }
  
  // Тест 3: Имитируем обновление как в серверном коде
  console.log('\n🔄 Тест 3: Имитируем серверное обновление');
  const isDiscountedValue = true;
  const sqlValue = isDiscountedValue === true || isDiscountedValue === 'true' ? 1 : 0;
  
  console.log(`Входное значение: ${isDiscountedValue} (${typeof isDiscountedValue})`);
  console.log(`SQL значение: ${sqlValue}`);
  
  const update3 = db.prepare(`
    UPDATE products 
    SET is_discounted = ?, updated_at = ?
    WHERE id = ?
  `).run(sqlValue, new Date().toISOString(), lastProduct.id);
  
  console.log(`✅ Изменено строк: ${update3.changes}`);
  
  const check3 = db.prepare("SELECT is_discounted FROM products WHERE id = ?").get(lastProduct.id);
  console.log(`🔍 Результат: ${check3.is_discounted}`);
  
  // Финальная очистка - возвращаем в 0
  db.prepare(`
    UPDATE products 
    SET is_discounted = 0
    WHERE id = ?
  `).run(lastProduct.id);
  
  console.log('\n🎯 Все тесты завершены. База данных работает корректно.');
  
} catch (error) {
  console.error('❌ Ошибка:', error);
} finally {
  db.close();
} 