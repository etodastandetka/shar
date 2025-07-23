const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  const db = new Database(dbPath);

  console.log('🔍 Отладка Telegram токенов...\n');

  // Проверяем конкретные токены из логов
  const tokens = [
    '9dsixh2ojnt4zlisg1py7s',
    '1qso73gt0esshgvadb2j3k', 
    '7rqhvxemp67a2v2jwjcs2f'
  ];

  console.log('📋 Проверка токенов:');
  for (const token of tokens) {
    const user = db.prepare('SELECT * FROM users WHERE telegram_verification_token = ?').get(token);
    console.log(`  Token: ${token}`);
    console.log(`  Найден: ${user ? `✅ ${user.email} (ID: ${user.id})` : '❌ НЕТ'}`);
    if (user) {
      console.log(`    Chat ID: ${user.telegram_chat_id || 'не установлен'}`);
      console.log(`    Verified: ${user.telegram_verified}`);
    }
    console.log('');
  }

  // Проверяем пользователя с Chat ID 1333967466
  console.log('👤 Проверка пользователя с Chat ID 1333967466:');
  const userByChatId = db.prepare('SELECT * FROM users WHERE telegram_chat_id = ?').get('1333967466');
  if (userByChatId) {
    console.log(`✅ Найден: ${userByChatId.email}`);
    console.log(`   ID: ${userByChatId.id}`);
    console.log(`   Токен: ${userByChatId.telegram_verification_token || 'отсутствует'}`);
    console.log(`   Verified: ${userByChatId.telegram_verified}`);
  } else {
    console.log('❌ Пользователь с таким Chat ID не найден');
  }

  // Показываем всех пользователей с токенами верификации
  console.log('\n📊 Все пользователи с активными токенами:');
  const usersWithTokens = db.prepare('SELECT email, telegram_verification_token, telegram_chat_id, telegram_verified FROM users WHERE telegram_verification_token IS NOT NULL').all();
  
  if (usersWithTokens.length === 0) {
    console.log('❌ Нет пользователей с токенами верификации');
  } else {
    usersWithTokens.forEach(user => {
      console.log(`  📧 ${user.email}`);
      console.log(`     Token: ${user.telegram_verification_token}`);
      console.log(`     Chat ID: ${user.telegram_chat_id || 'не установлен'}`);
      console.log(`     Verified: ${user.telegram_verified ? '✅' : '❌'}`);
      console.log('');
    });
  }

  // Проверяем таблицу pending_registrations
  console.log('📋 Проверка ожидающих регистраций:');
  const pendingUsers = db.prepare('SELECT * FROM pending_registrations WHERE phone_verified = 1').all();
  
  if (pendingUsers.length === 0) {
    console.log('❌ Нет ожидающих регистраций с подтвержденным телефоном');
  } else {
    console.log(`✅ Найдено ${pendingUsers.length} ожидающих регистраций:`);
    pendingUsers.forEach(user => {
      console.log(`  📧 ${user.email} | 📱 ${user.phone} | 🔑 Token: ${user.telegram_verification_token || 'отсутствует'}`);
    });
  }

} catch (error) {
  console.error('❌ Ошибка:', error);
} 