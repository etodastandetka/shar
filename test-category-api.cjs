const Database = require('better-sqlite3');
const path = require('path');

// Подключаемся к базе данных
const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('=== ТЕСТИРОВАНИЕ API ФИЛЬТРАЦИИ ПО КАТЕГОРИЯМ ===\n');

// Функция для форматирования товара как на сервере
function formatProductForClient(product) {
  if (!product) return null;
  
  // Преобразуем строку JSON в массив для images и labels
  let images = [];
  if (product.images) {
    try {
      images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
    } catch (e) {
      console.error("Ошибка при парсинге JSON images:", e);
    }
  }
  
  let labels = [];
  if (product.labels) {
    try {
      labels = typeof product.labels === 'string' ? JSON.parse(product.labels) : product.labels;
    } catch (e) {
      console.error("Ошибка при парсинге JSON labels:", e);
    }
  }
  
  // Формируем объект товара с правильными именами полей
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    originalPrice: product.original_price,
    images: images,
    quantity: product.quantity,
    category: product.category,
    isAvailable: Boolean(product.is_available),
    isPreorder: Boolean(product.is_preorder),
    isRare: Boolean(product.is_rare),
    isEasyToCare: Boolean(product.is_easy_to_care),
    labels: labels,
    deliveryCost: product.delivery_cost,
    plantSize: product.plant_size || 'medium',
    lightLevel: product.light_level || 'moderate',
    humidityLevel: product.humidity_level || 'medium',
    plantType: product.plant_type || 'decorative',
    origin: product.origin || 'tropical',
    isPetSafe: Boolean(product.is_pet_safe),
    isAirPurifying: Boolean(product.is_air_purifying),
    isFlowering: Boolean(product.is_flowering),
    isHotDeal: Boolean(product.is_hot_deal),
    isBestseller: Boolean(product.is_bestseller),
    isNewArrival: Boolean(product.is_new_arrival),
    isLimitedEdition: Boolean(product.is_limited_edition),
    isDiscounted: Boolean(product.is_discounted),
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

try {
  // 1. Тестируем API /api/categories
  console.log('📂 Тест API /api/categories:');
  const products = db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''").all();
  const categories = products.map(product => product.category).filter(Boolean);
  console.log('  Найдено категорий:', categories.length);
  categories.forEach(cat => {
    console.log(`  - ${cat}`);
  });

  // 2. Тестируем фильтрацию по каждой категории
  console.log('\n🔍 Тест фильтрации по категориям:');
  
  // Получаем все товары из базы данных как на сервере
  const rawProducts = db.prepare("SELECT * FROM products").all();
  const allProducts = rawProducts.map(product => formatProductForClient(product));
  console.log(`  Всего товаров в БД: ${allProducts.length}`);

  categories.forEach(category => {
    // Фильтруем по категории как на сервере
    const filteredProducts = allProducts.filter(product => 
      product && product.category === category
    );
    
    console.log(`\n  Категория "${category}": ${filteredProducts.length} товаров`);
    
    if (filteredProducts.length > 0) {
      // Показываем первые 3 товара
      filteredProducts.slice(0, 3).forEach(product => {
        console.log(`    - [${product.id}] ${product.name} (${product.price}₽)`);
      });
      
      if (filteredProducts.length > 3) {
        console.log(`    ... и еще ${filteredProducts.length - 3} товаров`);
      }
    } else {
      console.log('    ❌ Товары не найдены!');
    }
  });

  // 3. Тестируем редкие товары
  console.log('\n🌟 Тест фильтрации редких товаров:');
  const rareProducts = allProducts.filter(product => 
    product && product.isRare
  );
  console.log(`  Редких товаров: ${rareProducts.length}`);
  
  rareProducts.slice(0, 5).forEach(product => {
    console.log(`    - [${product.id}] ${product.name} (${product.category})`);
  });

  console.log('\n✅ Тестирование завершено');
} catch (error) {
  console.error('❌ Ошибка при тестировании:', error);
} finally {
  db.close();
} 