const Database = require('better-sqlite3');
const path = require('path');

try {
    // Подключаемся к базе данных
    const dbPath = path.join(__dirname, 'db', 'database.sqlite');
    const db = new Database(dbPath);
    
    console.log('🔍 Проверяем товары в базе данных...\n');
    
    // Проверяем все таблицы
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
    console.log('📋 Доступные таблицы:');
    tables.forEach(table => console.log(`  - ${table.name}`));
    console.log('');
    
    // Ищем таблицу с товарами
    const productTableNames = ['products', 'product', 'товары', 'catalog'];
    let productsTable = null;
    
    for (const tableName of productTableNames) {
        try {
            const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
            productsTable = tableName;
            console.log(`✅ Найдена таблица товаров: "${tableName}"`);
            break;
        } catch (e) {
            // Таблица не существует
        }
    }
    
    if (productsTable) {
        // Получаем все товары
        const products = db.prepare(`SELECT * FROM ${productsTable} ORDER BY id`).all();
        
        console.log(`📦 Всего товаров в таблице "${productsTable}": ${products.length}\n`);
        
        if (products.length > 0) {
            console.log('🛍️ Список товаров:');
            products.forEach((product, index) => {
                console.log(`\n${index + 1}. ID: ${product.id}`);
                console.log(`   Название: ${product.name || product.title || 'не указано'}`);
                console.log(`   Цена: ${product.price || 'не указана'}`);
                console.log(`   Категория: ${product.category || 'не указана'}`);
                console.log(`   Описание: ${(product.description || '').substring(0, 100)}${product.description && product.description.length > 100 ? '...' : ''}`);
                if (product.image_url || product.image) {
                    console.log(`   Изображение: ${product.image_url || product.image}`);
                }
                if (product.stock !== undefined) {
                    console.log(`   В наличии: ${product.stock}`);
                }
            });
        } else {
            console.log('❌ Товары не найдены в базе данных!');
            console.log('\n💡 Возможные причины:');
            console.log('   1. Товары еще не были добавлены');
            console.log('   2. Товары были удалены');
            console.log('   3. Товары хранятся в другой таблице');
        }
    } else {
        console.log('❌ Таблица с товарами не найдена!');
        console.log('\n📋 Попробуем найти в других таблицах...');
        
        for (const table of tables) {
            try {
                const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
                const hasProductFields = columns.some(col => 
                    ['name', 'title', 'price', 'product'].some(field => 
                        col.name.toLowerCase().includes(field)
                    )
                );
                
                if (hasProductFields) {
                    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
                    console.log(`\n🔍 Таблица "${table.name}" (${count.count} записей):`);
                    columns.forEach(col => console.log(`   - ${col.name} (${col.type})`));
                    
                    if (count.count > 0 && count.count <= 10) {
                        const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
                        console.log(`   Примеры данных:`);
                        sample.forEach((row, idx) => {
                            console.log(`   ${idx + 1}. ${JSON.stringify(row, null, 2)}`);
                        });
                    }
                }
            } catch (e) {
                // Пропускаем ошибки
            }
        }
    }
    
    db.close();
    
} catch (error) {
    console.error('❌ Ошибка при работе с базой данных:', error.message);
    console.log('\n🔧 Проверьте:');
    console.log('   1. Существует ли файл db/database.sqlite');
    console.log('   2. Правильно ли настроена база данных');
} 