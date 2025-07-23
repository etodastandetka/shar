const Database = require('better-sqlite3');
const path = require('path');

try {
    console.log('🔍 ПРОСТАЯ ПРОВЕРКА БАЗЫ ДАННЫХ (БЕЗ ИЗМЕНЕНИЙ)\n');
    
    const dbPath = path.join(__dirname, 'db', 'database.sqlite');
    const db = new Database(dbPath, { readonly: true }); // Только чтение!
    
    // Проверяем таблицы
    console.log('📋 Существующие таблицы:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
    tables.forEach(table => console.log(`   - ${table.name}`));
    
    // Проверяем пользователей
    console.log('\n👥 Пользователи:');
    try {
        const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
        console.log(`   Всего пользователей: ${users.count}`);
        
        if (users.count > 0) {
            const sampleUsers = db.prepare('SELECT username, email, is_admin FROM users LIMIT 3').all();
            sampleUsers.forEach(user => {
                console.log(`   - ${user.username} (${user.email || 'без email'}) ${user.is_admin ? '[АДМИН]' : ''}`);
            });
        }
    } catch (e) {
        console.log('   ❌ Таблица users не найдена или ошибка:', e.message);
    }
    
    // Проверяем товары
    console.log('\n📦 Товары:');
    try {
        const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
        console.log(`   Всего товаров: ${products.count}`);
        
        if (products.count > 0) {
            const sampleProducts = db.prepare('SELECT name, price FROM products LIMIT 3').all();
            sampleProducts.forEach(product => {
                const priceRub = product.price > 1000 ? (product.price / 100).toFixed(2) : product.price;
                console.log(`   - ${product.name} (${priceRub} руб)`);
            });
        }
    } catch (e) {
        console.log('   ❌ Таблица products не найдена или ошибка:', e.message);
    }
    
    // Проверяем ожидающих регистрацию
    console.log('\n⏳ Ожидающие регистрацию:');
    try {
        const pending = db.prepare('SELECT COUNT(*) as count FROM pending_registrations').get();
        console.log(`   Ожидающих: ${pending.count}`);
    } catch (e) {
        console.log('   ❌ Таблица pending_registrations не найдена или ошибка:', e.message);
    }
    
    db.close();
    console.log('\n✅ Проверка завершена. Никаких изменений не внесено.');
    
} catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
} 