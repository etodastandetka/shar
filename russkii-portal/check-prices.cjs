const Database = require('better-sqlite3');

try {
  const db = new Database('./db/database.sqlite');
  
  const products = db.prepare(`
    SELECT id, name, price, original_price 
    FROM products 
    ORDER BY price
  `).all();
  
  console.log('=== ПРОВЕРКА ЦЕН ТОВАРОВ ===\n');
  console.log(`Всего товаров: ${products.length}\n`);
  
  products.forEach(product => {
    console.log(`ID: ${product.id}`);
    console.log(`Название: ${product.name}`);
    console.log(`Цена: ${product.price} руб.`);
    if (product.original_price) {
      console.log(`Старая цена: ${product.original_price} руб.`);
    }
    console.log('---');
  });
  
  // Статистика по ценам
  const prices = products.map(p => parseFloat(p.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  console.log('\n=== СТАТИСТИКА ЦЕН ===');
  console.log(`Минимальная цена: ${minPrice} руб.`);
  console.log(`Максимальная цена: ${maxPrice} руб.`);
  console.log(`Средняя цена: ${avgPrice.toFixed(2)} руб.`);
  
  // Поиск подозрительно низких цен
  const lowPrices = products.filter(p => parseFloat(p.price) < 500);
  if (lowPrices.length > 0) {
    console.log('\n=== ТОВАРЫ С НИЗКИМИ ЦЕНАМИ (< 500 руб.) ===');
    lowPrices.forEach(p => {
      console.log(`${p.name}: ${p.price} руб.`);
    });
  }
  
  db.close();
} catch (error) {
  console.error('Ошибка:', error.message);
} 