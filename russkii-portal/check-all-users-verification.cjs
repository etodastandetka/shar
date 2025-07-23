const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('=== ПРОВЕРКА ВЕРИФИКАЦИИ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ===\n');

try {
    // Проверяем структуру таблицы users
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    console.log('Колонки в таблице users:');
    tableInfo.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
    });
    console.log('');

    // Получаем всех пользователей
    const users = db.prepare(`
        SELECT 
            id, username, email, phone, 
            phone_verified, telegram_id, telegram_verified,
            created_at
        FROM users 
        ORDER BY created_at DESC
    `).all();

    console.log(`Найдено пользователей: ${users.length}\n`);

    users.forEach((user, index) => {
        console.log(`--- Пользователь ${index + 1} ---`);
        console.log(`ID: ${user.id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email}`);
        console.log(`Phone: ${user.phone}`);
        console.log(`Phone verified: ${user.phone_verified}`);
        console.log(`Telegram ID: ${user.telegram_id}`);
        console.log(`Telegram verified: ${user.telegram_verified}`);
        console.log(`Created at: ${user.created_at}`);
        console.log('');
    });

    // Проверяем ожидающие регистрации
    const pending = db.prepare(`
        SELECT 
            id, phone, phone_code, phone_verified,
            telegram_verification_token, created_at
        FROM pending_registrations 
        ORDER BY created_at DESC
    `).all();

    console.log(`=== ОЖИДАЮЩИЕ РЕГИСТРАЦИИ: ${pending.length} ===\n`);
    
    pending.forEach((p, index) => {
        console.log(`--- Ожидающая регистрация ${index + 1} ---`);
        console.log(`ID: ${p.id}`);
        console.log(`Phone: ${p.phone}`);
        console.log(`Phone code: ${p.phone_code}`);
        console.log(`Phone verified: ${p.phone_verified}`);
        console.log(`Telegram token: ${p.telegram_verification_token}`);
        console.log(`Created at: ${p.created_at}`);
        console.log('');
    });

} catch (error) {
    console.error('Ошибка при проверке верификации:', error);
} finally {
    db.close();
} 