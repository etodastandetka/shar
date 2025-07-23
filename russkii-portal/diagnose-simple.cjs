const Database = require('better-sqlite3');
const path = require('path');

console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМ С БАЗОЙ ДАННЫХ');

try {
    const dbPath = path.join(__dirname, 'db', 'database.sqlite');
    console.log(`📁 Путь к базе данных: ${dbPath}`);
    
    // Проверяем существование файла
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
        console.log('❌ Файл базы данных НЕ СУЩЕСТВУЕТ!');
        console.log('💡 Решение: создайте базу данных или запустите миграции');
        process.exit(1);
    }
    
    console.log('✅ Файл базы данных существует');
    
    // Подключаемся к базе данных
    const db = new Database(dbPath);
    console.log('✅ Подключение к базе данных успешно');
    
    // Проверяем таблицы
    console.log('\n📋 ПРОВЕРКА ТАБЛИЦ:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
    console.log(`   Найдено таблиц: ${tables.length}`);
    
    const requiredTables = ['users', 'products', 'orders', 'pending_registrations'];
    const existingTables = tables.map(t => t.name);
    
    requiredTables.forEach(table => {
        if (existingTables.includes(table)) {
            console.log(`   ✅ ${table} - СУЩЕСТВУЕТ`);
        } else {
            console.log(`   ❌ ${table} - НЕ НАЙДЕНА`);
        }
    });
    
    // Проверяем пользователей
    console.log('\n👥 ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ:');
    try {
        const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        console.log(`   Пользователей в базе: ${usersCount.count}`);
        
        if (usersCount.count > 0) {
            const sampleUsers = db.prepare('SELECT id, email, is_admin FROM users LIMIT 3').all();
            sampleUsers.forEach(user => {
                console.log(`   - ID: ${user.id}, Email: ${user.email}, Админ: ${user.is_admin ? 'Да' : 'Нет'}`);
            });
        } else {
            console.log('   ⚠️ В базе нет пользователей');
        }
    } catch (e) {
        console.log(`   ❌ Ошибка проверки пользователей: ${e.message}`);
    }
    
    // Проверяем товары
    console.log('\n📦 ПРОВЕРКА ТОВАРОВ:');
    try {
        const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
        console.log(`   Товаров в базе: ${productsCount.count}`);
        
        if (productsCount.count > 0) {
            const sampleProducts = db.prepare('SELECT id, name, price FROM products LIMIT 3').all();
            sampleProducts.forEach(product => {
                console.log(`   - ID: ${product.id}, Название: ${product.name}, Цена: ${product.price}`);
            });
        } else {
            console.log('   ⚠️ В базе нет товаров');
        }
    } catch (e) {
        console.log(`   ❌ Ошибка проверки товаров: ${e.message}`);
    }
    
    // Проверяем структуру таблицы products
    console.log('\n🏗️ СТРУКТУРА ТАБЛИЦЫ PRODUCTS:');
    try {
        const productColumns = db.prepare('PRAGMA table_info(products)').all();
        console.log('   Колонки в таблице products:');
        productColumns.forEach(col => {
            console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
    } catch (e) {
        console.log(`   ❌ Ошибка получения структуры таблицы products: ${e.message}`);
    }
    
    // Проверяем ожидающих регистрацию
    console.log('\n⏳ ПРОВЕРКА ОЖИДАЮЩИХ РЕГИСТРАЦИЮ:');
    try {
        const pendingCount = db.prepare('SELECT COUNT(*) as count FROM pending_registrations').get();
        console.log(`   Ожидающих регистрацию: ${pendingCount.count}`);
        
        if (pendingCount.count > 0) {
            const pendingUsers = db.prepare('SELECT username, phone, phone_verified FROM pending_registrations').all();
            pendingUsers.forEach(user => {
                console.log(`   - ${user.username} (${user.phone}) - Телефон подтвержден: ${user.phone_verified ? 'Да' : 'Нет'}`);
            });
        }
    } catch (e) {
        console.log(`   ❌ Ошибка проверки pending_registrations: ${e.message}`);
    }
    
    db.close();
    
    console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА');
    
} catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('\nВозможные причины:');
    console.log('1. База данных повреждена');
    console.log('2. Нет прав доступа к файлу');
    console.log('3. База данных заблокирована другим процессом');
} 