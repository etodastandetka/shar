const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Функция для хеширования паролей
function hashPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const iterations = 10000;
    const keylen = 64;
    const digest = 'sha512';
    
    const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
    return `${salt}:${iterations}:${keylen}:${digest}:${hash}`;
}

try {
    console.log('🔧 ПОЛНАЯ ДИАГНОСТИКА И ВОССТАНОВЛЕНИЕ БАЗЫ ДАННЫХ\n');
    
    const dbPath = path.join(__dirname, 'db', 'database.sqlite');
    const db = new Database(dbPath);
    
    // 1. Проверяем все таблицы
    console.log('📋 1. ПРОВЕРКА ТАБЛИЦ:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all();
    console.log(`   Найдено таблиц: ${tables.length}`);
    tables.forEach(table => console.log(`   - ${table.name}`));
    
    // 2. Создаем недостающие таблицы
    console.log('\n🏗️ 2. СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ:');
    
    // Таблица пользователей
    try {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                phone TEXT,
                telegram_id TEXT,
                phone_verified BOOLEAN DEFAULT 0,
                telegram_verified BOOLEAN DEFAULT 0,
                is_admin BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        console.log('   ✅ Таблица users создана/проверена');
    } catch (e) {
        console.log('   ❌ Ошибка создания таблицы users:', e.message);
    }
    
    // Таблица товаров
    try {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price INTEGER NOT NULL,
                category TEXT,
                image_url TEXT,
                stock INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        console.log('   ✅ Таблица products создана/проверена');
    } catch (e) {
        console.log('   ❌ Ошибка создания таблицы products:', e.message);
    }
    
    // Таблица ожидающих регистрацию
    try {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS pending_registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT,
                password_hash TEXT NOT NULL,
                phone TEXT NOT NULL,
                telegram_id TEXT,
                phone_verified BOOLEAN DEFAULT 0,
                telegram_verified BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        console.log('   ✅ Таблица pending_registrations создана/проверена');
    } catch (e) {
        console.log('   ❌ Ошибка создания таблицы pending_registrations:', e.message);
    }
    
    // Таблица заказов
    try {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                total_amount INTEGER,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `).run();
        console.log('   ✅ Таблица orders создана/проверена');
    } catch (e) {
        console.log('   ❌ Ошибка создания таблицы orders:', e.message);
    }
    
    // 3. Проверяем пользователей
    console.log('\n👥 3. ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ:');
    try {
        const users = db.prepare('SELECT * FROM users').all();
        console.log(`   Всего пользователей: ${users.length}`);
        
        if (users.length > 0) {
            console.log('   Пользователи:');
            users.forEach((user, idx) => {
                console.log(`   ${idx + 1}. ${user.username} (ID: ${user.id})`);
                console.log(`      Email: ${user.email || 'не указан'}`);
                console.log(`      Телефон: ${user.phone || 'не указан'}`);
                console.log(`      Телефон подтвержден: ${user.phone_verified ? 'Да' : 'Нет'}`);
                console.log(`      Telegram подтвержден: ${user.telegram_verified ? 'Да' : 'Нет'}`);
                console.log(`      Админ: ${user.is_admin ? 'Да' : 'Нет'}`);
                
                // Проверяем формат пароля
                if (user.password_hash) {
                    const parts = user.password_hash.split(':');
                    if (parts.length === 5) {
                        console.log(`      Пароль: ✅ правильный формат (pbkdf2)`);
                    } else if (parts.length === 1 && user.password_hash.startsWith('$2b$')) {
                        console.log(`      Пароль: ⚠️ bcrypt формат (нужно обновить)`);
                    } else {
                        console.log(`      Пароль: ❌ неизвестный формат`);
                    }
                }
                console.log('');
            });
        }
        
        // Создаем админа если его нет
        const admin = db.prepare('SELECT * FROM users WHERE is_admin = 1').get();
        if (!admin) {
            console.log('   🔧 Создаем админа...');
            const adminPassword = hashPassword('admin123');
            db.prepare(`
                INSERT INTO users (username, email, password_hash, is_admin, phone_verified, telegram_verified)
                VALUES (?, ?, ?, 1, 1, 1)
            `).run('admin', 'admin@russkii-portal.ru', adminPassword);
            console.log('   ✅ Админ создан: admin / admin123');
        }
        
    } catch (e) {
        console.log('   ❌ Ошибка проверки пользователей:', e.message);
    }
    
    // 4. Проверяем товары
    console.log('\n📦 4. ПРОВЕРКА ТОВАРОВ:');
    try {
        const products = db.prepare('SELECT * FROM products').all();
        console.log(`   Всего товаров: ${products.length}`);
        
        if (products.length === 0) {
            console.log('   🔧 Добавляем тестовые товары...');
            
            const testProducts = [
                {
                    name: 'Фикус Бенджамина',
                    description: 'Красивое комнатное растение с глянцевыми листьями',
                    price: 150000, // 1500.00 руб в копейках
                    category: 'Комнатные растения',
                    stock: 10
                },
                {
                    name: 'Монстера Деликатесная',
                    description: 'Тропическое растение с резными листьями',
                    price: 250000, // 2500.00 руб в копейках
                    category: 'Комнатные растения',
                    stock: 5
                },
                {
                    name: 'Сансевиерия (Тещин язык)',
                    description: 'Неприхотливое растение для начинающих',
                    price: 80000, // 800.00 руб в копейках
                    category: 'Комнатные растения',
                    stock: 15
                }
            ];
            
            const insertProduct = db.prepare(`
                INSERT INTO products (name, description, price, category, stock)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            testProducts.forEach(product => {
                insertProduct.run(product.name, product.description, product.price, product.category, product.stock);
            });
            
            console.log(`   ✅ Добавлено ${testProducts.length} тестовых товаров`);
        } else {
            console.log('   Товары:');
            products.slice(0, 5).forEach((product, idx) => {
                console.log(`   ${idx + 1}. ${product.name} - ${(product.price / 100).toFixed(2)} руб`);
                console.log(`      Категория: ${product.category || 'не указана'}`);
                console.log(`      В наличии: ${product.stock || 0}`);
            });
            if (products.length > 5) {
                console.log(`   ... и еще ${products.length - 5} товаров`);
            }
        }
    } catch (e) {
        console.log('   ❌ Ошибка проверки товаров:', e.message);
    }
    
    // 5. Проверяем pending_registrations
    console.log('\n⏳ 5. ПРОВЕРКА ОЖИДАЮЩИХ РЕГИСТРАЦИЮ:');
    try {
        const pending = db.prepare('SELECT * FROM pending_registrations').all();
        console.log(`   Ожидающих регистрацию: ${pending.length}`);
        
        if (pending.length > 0) {
            pending.forEach((user, idx) => {
                console.log(`   ${idx + 1}. ${user.username} - ${user.phone}`);
                console.log(`      Телефон подтвержден: ${user.phone_verified ? 'Да' : 'Нет'}`);
                console.log(`      Telegram подтвержден: ${user.telegram_verified ? 'Да' : 'Нет'}`);
            });
        }
    } catch (e) {
        console.log('   ❌ Ошибка проверки pending_registrations:', e.message);
    }
    
    // 6. Исправляем неправильные пароли
    console.log('\n🔐 6. ИСПРАВЛЕНИЕ ПАРОЛЕЙ:');
    try {
        const usersWithBadPasswords = db.prepare(`
            SELECT * FROM users 
            WHERE password_hash NOT LIKE '%:%:%:%:%'
            AND password_hash NOT LIKE '$2b$%'
        `).all();
        
        if (usersWithBadPasswords.length > 0) {
            console.log(`   Найдено ${usersWithBadPasswords.length} пользователей с неправильными паролями`);
            
            usersWithBadPasswords.forEach(user => {
                console.log(`   Исправляем пароль для: ${user.username}`);
                const newPassword = hashPassword('temp123'); // Временный пароль
                db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPassword, user.id);
                console.log(`   ✅ Установлен временный пароль: temp123`);
            });
        } else {
            console.log('   ✅ Все пароли в правильном формате');
        }
    } catch (e) {
        console.log('   ❌ Ошибка исправления паролей:', e.message);
    }
    
    console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА!');
    console.log('\n📝 ИТОГИ:');
    console.log('   - База данных проверена и восстановлена');
    console.log('   - Созданы все необходимые таблицы');
    console.log('   - Добавлен админ: admin / admin123 (если не было)');
    console.log('   - Добавлены тестовые товары (если не было)');
    console.log('   - Исправлены неправильные пароли');
    
    console.log('\n🚀 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('   1. Перезапустите сервер');
    console.log('   2. Попробуйте войти как admin / admin123');
    console.log('   3. Проверьте отображение товаров на сайте');
    console.log('   4. Протестируйте регистрацию нового пользователя');
    
    db.close();
    
} catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.log('\n🔧 Возможные решения:');
    console.log('   1. Проверьте права доступа к файлу базы данных');
    console.log('   2. Убедитесь что база данных не заблокирована другим процессом');
    console.log('   3. Попробуйте остановить сервер и telegram-bot перед запуском');
} 