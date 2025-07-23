const Database = require('better-sqlite3');

try {
  const db = new Database('./db/database.sqlite');
  
  console.log('=== ИСПРАВЛЕНИЕ ЦЕН: КОПЕЙКИ → РУБЛИ ===\n');
  
  // Получаем все товары с подозрительно низкими ценами (менее 500 = вероятно в копейках)
  const lowPriceProducts = db.prepare(`
    SELECT id, name, price, original_price 
    FROM products 
    WHERE price < 500
  `).all();
  
  console.log(`Найдено товаров с ценами менее 500: ${lowPriceProducts.length}\n`);
  
  if (lowPriceProducts.length === 0) {
    console.log('✅ Все цены уже в нормальном диапазоне');
    db.close();
    return;
  }
  
  const updatePrice = db.prepare(`
    UPDATE products 
    SET price = ?, original_price = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  
  let updatedCount = 0;
  
  lowPriceProducts.forEach(product => {
    // Конвертируем копейки в рубли (делим на 100)
    const newPrice = Math.round(parseFloat(product.price) / 100 * 100) / 100; // Округляем до 2 знаков
    const newOriginalPrice = product.original_price ? 
      Math.round(parseFloat(product.original_price) / 100 * 100) / 100 : null;
    
    // Если цена все еще слишком низкая, устанавливаем минимум 500 рублей
    const finalPrice = newPrice < 5 ? Math.max(500, newPrice * 100) : newPrice;
    const finalOriginalPrice = newOriginalPrice && newOriginalPrice < 5 ? 
      Math.max(600, newOriginalPrice * 100) : newOriginalPrice;
    
    const result = updatePrice.run(finalPrice, finalOriginalPrice, product.id);
    
    if (result.changes > 0) {
      console.log(`✅ ${product.name}:`);
      console.log(`   ${product.price} → ${finalPrice} руб.`);
      if (product.original_price) {
        console.log(`   Старая цена: ${product.original_price} → ${finalOriginalPrice} руб.`);
      }
      console.log('');
      updatedCount++;
    }
  });
  
  console.log(`=== РЕЗУЛЬТАТ ===`);
  console.log(`Обновлено товаров: ${updatedCount}`);
  
  // Показываем новую статистику
  const allProducts = db.prepare(`
    SELECT price FROM products ORDER BY price
  `).all();
  
  const prices = allProducts.map(p => parseFloat(p.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  console.log(`\n=== НОВАЯ СТАТИСТИКА ЦЕН ===`);
  console.log(`Минимальная цена: ${minPrice} руб.`);
  console.log(`Максимальная цена: ${maxPrice} руб.`);
  console.log(`Средняя цена: ${avgPrice.toFixed(2)} руб.`);
  
  // Проверяем, остались ли товары с низкими ценами
  const stillLowPrices = db.prepare(`
    SELECT COUNT(*) as count FROM products WHERE price < 100
  `).get();
  
  if (stillLowPrices.count > 0) {
    console.log(`⚠️ Внимание: еще ${stillLowPrices.count} товаров с ценой менее 100 руб.`);
  } else {
    console.log(`✅ Все цены приведены в порядок!`);
  }
  
  db.close();
  console.log('\n✅ Исправление цен завершено!');
  
} catch (error) {
  console.error('❌ Ошибка при исправлении цен:', error.message);
} 