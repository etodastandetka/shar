const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = Database(dbPath);

console.log('🔍 ПРОВЕРКА БАЗЫ ДАННЫХ ПОСЛЕ ОЧИСТКИ:');
console.log('=====================================');

// Проверяем пользователей
const users = db.prepare("SELECT id, username, email, telegram_id, telegram_verification_token FROM users").all();
console.log(`\n👥 ПОЛЬЗОВАТЕЛИ (${users.length}):`);
users.forEach(user => {
    console.log(`   ID: ${user.id}, Email: ${user.email}, Telegram: ${user.telegram_id || 'НЕТ'}, Токен: ${user.telegram_verification_token || 'НЕТ'}`);
});

// Проверяем ожидающих регистрацию
const pending = db.prepare("SELECT id, email, phone, telegram_verification_token, phone_verified FROM pending_registrations").all();
console.log(`\n⏳ ОЖИДАЮЩИЕ РЕГИСТРАЦИЮ (${pending.length}):`);
pending.forEach(p => {
    console.log(`   ID: ${p.id}, Email: ${p.email}, Телефон: ${p.phone}, Токен: ${p.telegram_verification_token || 'НЕТ'}, Телефон подтвержден: ${p.phone_verified ? 'ДА' : 'НЕТ'}`);
});

// Ищем токены из логов
const tokens = ['aaprcujjm98a2584u6omb', 'oz23neko5htydtb528rmf', 's4gmm2vpddaj6of99k5etq'];
console.log(`\n🔑 ПОИСК ТОКЕНОВ ИЗ ЛОГОВ:`);
tokens.forEach(token => {
    const userWithToken = db.prepare("SELECT * FROM users WHERE telegram_verification_token = ?").get(token);
    const pendingWithToken = db.prepare("SELECT * FROM pending_registrations WHERE telegram_verification_token = ?").get(token);
    
    console.log(`   Токен: ${token}`);
    console.log(`   В users: ${userWithToken ? 'НАЙДЕН' : 'НЕ НАЙДЕН'}`);
    console.log(`   В pending: ${pendingWithToken ? 'НАЙДЕН' : 'НЕ НАЙДЕН'}`);
    console.log('   ---');
});

// Ищем пользователей по Chat ID
const chatIds = [5998116373, 6826609528];
console.log(`\n💬 ПОИСК ПО CHAT ID:`);
chatIds.forEach(chatId => {
    const userWithChatId = db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(chatId);
    console.log(`   Chat ID: ${chatId} - ${userWithChatId ? 'НАЙДЕН' : 'НЕ НАЙДЕН'}`);
});

db.close();
console.log(`\n✅ ПРОВЕРКА ЗАВЕРШЕНА`); 