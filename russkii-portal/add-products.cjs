const Database = require('better-sqlite3');
const path = require('path');

console.log('🌱 ДОБАВЛЕНИЕ ТОВАРОВ В БАЗУ ДАННЫХ');

try {
    const dbPath = path.join(__dirname, 'db', 'database.sqlite');
    const db = new Database(dbPath);
    
    // Проверяем текущее количество товаров
    const currentCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    console.log(`📦 Текущее количество товаров: ${currentCount.count}`);
    
    if (currentCount.count > 0) {
        console.log('⚠️ В базе уже есть товары. Хотите добавить еще? (будет добавлено к существующим)');
    }
    
    // Подготавливаем товары для добавления
    const products = [
        {
            name: 'Anthurium Regale',
            description: 'Роскошный антуриум с бархатистыми листьями и контрастными прожилками. Идеален для коллекционеров редких растений.',
            price: 1600, // в копейках (16.00 руб)
            category: 'Антуриумы',
            quantity: 3,
            is_available: 1,
            is_preorder: 0,
            is_rare: 1,
            is_easy_to_care: 0,
            plant_size: 'medium',
            light_level: 'bright',
            humidity_level: 'high',
            plant_type: 'tropical',
            origin: 'Colombia',
            is_pet_safe: 0,
            is_air_purifying: 1,
            is_flowering: 1,
            images: JSON.stringify(['/uploads/default-plant.jpg'])
        },
        {
            name: 'Anthurium Warocqueanum',
            description: 'Королева антуриумов с огромными бархатистыми листьями. Редкое коллекционное растение.',
            price: 2500,
            category: 'Антуриумы',
            quantity: 2,
            is_available: 1,
            is_preorder: 0,
            is_rare: 1,
            is_easy_to_care: 0,
            plant_size: 'large',
            light_level: 'bright',
            humidity_level: 'high',
            plant_type: 'tropical',
            origin: 'Colombia',
            is_pet_safe: 0,
            is_air_purifying: 1,
            is_flowering: 1,
            images: JSON.stringify(['/uploads/default-plant.jpg'])
        },
        {
            name: 'Anthurium Crystallinum',
            description: 'Потрясающий антуриум с кристально-белыми прожилками на темно-зеленых листьях.',
            price: 1400,
            category: 'Антуриумы',
            quantity: 5,
            is_available: 1,
            is_preorder: 0,
            is_rare: 1,
            is_easy_to_care: 0,
            plant_size: 'medium',
            light_level: 'bright',
            humidity_level: 'high',
            plant_type: 'tropical',
            origin: 'South America',
            is_pet_safe: 0,
            is_air_purifying: 1,
            is_flowering: 1,
            images: JSON.stringify(['/uploads/default-plant.jpg'])
        },
        {
            name: 'Anthurium Clarinervium',
            description: 'Элегантный антуриум с сердцевидными листьями и четкими белыми прожилками.',
            price: 1200,
            category: 'Антуриумы',
            quantity: 4,
            is_available: 1,
            is_preorder: 0,
            is_rare: 1,
            is_easy_to_care: 0,
            plant_size: 'medium',
            light_level: 'bright',
            humidity_level: 'high',
            plant_type: 'tropical',
            origin: 'Mexico',
            is_pet_safe: 0,
            is_air_purifying: 1,
            is_flowering: 1,
            images: JSON.stringify(['/uploads/default-plant.jpg'])
        },
        {
            name: 'Alocasia micholitziana variegated',
            description: 'Редкая вариегатная алоказия с потрясающими пестрыми листьями.',
            price: 2300,
            category: 'Алоказии',
            quantity: 1,
            is_available: 1,
            is_preorder: 0,
            is_rare: 1,
            is_easy_to_care: 0,
            plant_size: 'medium',
            light_level: 'bright',
            humidity_level: 'high',
            plant_type: 'tropical',
            origin: 'Southeast Asia',
            is_pet_safe: 0,
            is_air_purifying: 1,
            is_flowering: 0,
            images: JSON.stringify(['/uploads/default-plant.jpg'])
        },
        {
            name: 'Monstera Deliciosa',
            description: 'Классическая монстера с резными листьями. Неприхотливое растение для начинающих.',
            price: 800,
            category: 'Монстеры',
            quantity: 10,
            is_available: 1,
            is_preorder: 0,
            is_rare: 0,
            is_easy_to_care: 1,
            plant_size: 'large',
            light_level: 'moderate',
            humidity_level: 'medium',
            plant_type: 'tropical',
            origin: 'Central America',
            is_pet_safe: 0,
            is_air_purifying: 1,
            is_flowering: 0,
            images: JSON.stringify(['/uploads/default-plant.jpg'])
        },
        {
            name: 'Ficus Benjamina',
            description: 'Популярное комнатное растение с глянцевыми листьями. Отлично подходит для офисов.',
            price: 600,
            category: 'Фикусы',
            quantity: 15,
            is_available: 1,
            is_preorder: 0,
            is_rare: 0,
            is_easy_to_care: 1,
            plant_size: 'medium',
            light_level: 'moderate',
            humidity_level: 'low',
            plant_type: 'decorative',
            origin: 'India',
            is_pet_safe: 0,
            is_air_purifying: 1,
            is_flowering: 0,
            images: JSON.stringify(['/uploads/default-plant.jpg'])
        },
        {
            name: 'Sansevieria Trifasciata',
            description: 'Сансевиерия (тещин язык) - самое неприхотливое растение. Идеально для новичков.',
            price: 400,
            category: 'Сансевиерии',
            quantity: 20,
            is_available: 1,
            is_preorder: 0,
            is_rare: 0,
            is_easy_to_care: 1,
            plant_size: 'medium',
            light_level: 'low',
            humidity_level: 'low',
            plant_type: 'succulent',
            origin: 'Africa',
            is_pet_safe: 0,
            is_air_purifying: 1,
            is_flowering: 0,
            images: JSON.stringify(['/uploads/default-plant.jpg'])
        }
    ];
    
    // Подготавливаем запрос для вставки
    const insertProduct = db.prepare(`
        INSERT INTO products (
            name, description, price, category, quantity, 
            is_available, is_preorder, is_rare, is_easy_to_care,
            plant_size, light_level, humidity_level, plant_type, origin,
            is_pet_safe, is_air_purifying, is_flowering, images,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    console.log(`🚀 Добавляем ${products.length} товаров...`);
    
    let addedCount = 0;
    const currentTime = new Date().toISOString();
    
    products.forEach((product, index) => {
        try {
            insertProduct.run(
                product.name,
                product.description,
                product.price,
                product.category,
                product.quantity,
                product.is_available,
                product.is_preorder,
                product.is_rare,
                product.is_easy_to_care,
                product.plant_size,
                product.light_level,
                product.humidity_level,
                product.plant_type,
                product.origin,
                product.is_pet_safe,
                product.is_air_purifying,
                product.is_flowering,
                product.images,
                currentTime,
                currentTime
            );
            
            addedCount++;
            console.log(`✅ ${index + 1}. ${product.name} - ${(product.price / 100).toFixed(2)} руб`);
        } catch (error) {
            console.error(`❌ Ошибка добавления ${product.name}:`, error.message);
        }
    });
    
    // Проверяем результат
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    console.log(`\n🎉 РЕЗУЛЬТАТ:`);
    console.log(`   Добавлено товаров: ${addedCount}`);
    console.log(`   Всего товаров в базе: ${finalCount.count}`);
    
    if (finalCount.count > 0) {
        console.log('\n📝 Примеры товаров в базе:');
        const samples = db.prepare('SELECT id, name, price, category FROM products LIMIT 5').all();
        samples.forEach(product => {
            console.log(`   - ${product.name} (${(product.price / 100).toFixed(2)} руб) - ${product.category}`);
        });
    }
    
    db.close();
    
    console.log('\n✅ ТОВАРЫ УСПЕШНО ДОБАВЛЕНЫ!');
    console.log('Теперь можете перезапустить сервер и проверить товары на сайте.');
    
} catch (error) {
    console.error('❌ ОШИБКА:', error.message);
    console.log('\nВозможные причины:');
    console.log('1. База данных заблокирована (остановите сервер)');
    console.log('2. Таблица products не существует');
    console.log('3. Нет прав доступа к файлу базы данных');
} 