const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔍 ДИАГНОСТИКА TELEGRAM ВЕРИФИКАЦИИ');
console.log('===================================');

const testPhone = '+79920793424';
const testPhoneVariants = [
  '+79920793424',
  '79920793424', 
  '89920793424',
  '+7 992 079 3424',
  '9920793424'
];

console.log(`\n📱 Тестируемый номер: ${testPhone}`);
console.log(`📱 Варианты номера:`, testPhoneVariants);

// Функция нормализации (как в коде)
function normalizePhone(phone) {
  let normalized = phone.replace(/[^\d+]/g, '');
  
  if (normalized.startsWith('8')) {
    normalized = '+7' + normalized.slice(1);
  }
  
  if (normalized.startsWith('7') && !normalized.startsWith('+7')) {
    normalized = '+' + normalized;
  }
  
  if (!normalized.startsWith('+') && normalized.length === 11 && normalized.startsWith('7')) {
    normalized = '+' + normalized;
  }
  
  if (!normalized.startsWith('+') && normalized.length === 10) {
    normalized = '+7' + normalized;
  }
  
  console.log(`📞 Нормализация: "${phone}" -> "${normalized}"`);
  return normalized;
}

// 1. Проверяем что есть в pending_registrations
console.log('\n📋 Все pending registrations:');
const allPending = db.prepare('SELECT * FROM pending_registrations ORDER BY created_at DESC').all();

if (allPending.length === 0) {
  console.log('❌ НЕТ PENDING REGISTRATIONS!');
  console.log('💡 Нужно начать регистрацию на сайте заново');
} else {
  allPending.forEach((record, index) => {
    console.log(`\n${index + 1}. ID: ${record.id}`);
    console.log(`   📱 Phone: "${record.phone}"`);
    console.log(`   🔑 Token: "${record.verification_token}"`);
    console.log(`   ✅ Verified: ${record.verified ? 'YES' : 'NO'}`);
    console.log(`   📅 Created: ${record.created_at}`);
  });
}

// 2. Тестируем нормализацию для всех вариантов
console.log('\n🔧 ТЕСТ НОРМАЛИЗАЦИИ:');
testPhoneVariants.forEach(variant => {
  const normalized = normalizePhone(variant);
  console.log(`"${variant}" -> "${normalized}"`);
});

// 3. Поиск токена по номеру (имитация getVerificationTokenByPhone)
console.log('\n🔍 ПОИСК ТОКЕНА ПО НОМЕРУ:');
testPhoneVariants.forEach(variant => {
  const normalized = normalizePhone(variant);
  
  const result = db.prepare(`
    SELECT verification_token FROM pending_registrations 
    WHERE phone = ? AND verified = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).get(normalized);
  
  console.log(`Номер: "${variant}" (${normalized}) -> Токен: ${result ? result.verification_token : 'НЕ НАЙДЕН'}`);
});

// 4. Проверка функции markPhoneAsVerified для конкретного номера
if (allPending.length > 0) {
  const latestRecord = allPending[0];
  console.log(`\n🧪 ТЕСТ ПОДТВЕРЖДЕНИЯ с последней записью:`);
  console.log(`   Запись: Phone="${latestRecord.phone}", Token="${latestRecord.verification_token}"`);
  
  testPhoneVariants.forEach(variant => {
    const normalized = normalizePhone(variant);
    
    // Поиск точного совпадения
    let result = db.prepare(`
      SELECT * FROM pending_registrations 
      WHERE phone = ? AND verification_token = ?
    `).get(normalized, latestRecord.verification_token);
    
    console.log(`\n   Вариант: "${variant}" (${normalized})`);
    console.log(`   Точное совпадение: ${result ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО'}`);
    
    // Поиск только по токену
    if (!result) {
      result = db.prepare(`
        SELECT * FROM pending_registrations 
        WHERE verification_token = ?
      `).get(latestRecord.verification_token);
      
      if (result) {
        console.log(`   Поиск по токену: НАЙДЕНО (phone="${result.phone}")`);
        console.log(`   Сравнение: "${normalized}" === "${result.phone}" -> ${normalized === result.phone}`);
        
        // Проверка вариантов
        const phoneVariants = [
          variant,
          normalized,
          variant.replace(/[^\d]/g, ''),
          '+7' + variant.replace(/[^\d]/g, '').slice(-10),
          '8' + variant.replace(/[^\d]/g, '').slice(-10),
        ];
        
        console.log(`   Варианты для проверки:`, phoneVariants);
        console.log(`   Один из вариантов совпадает: ${phoneVariants.includes(result.phone)}`);
      }
    }
  });
}

// 5. Рекомендации
console.log('\n💡 РЕКОМЕНДАЦИИ:');

if (allPending.length === 0) {
  console.log('1. ❌ Нет pending registrations - начните регистрацию на сайте');
  console.log('2. 🔗 Перейдите на сайт: https://helens-jungle.ru/auth');
  console.log('3. 📝 Заполните форму регистрации');
  console.log('4. 📱 Получите ссылку на Telegram бота');
} else {
  const latest = allPending[0];
  console.log('1. ✅ Есть pending registration');
  console.log(`2. 🔗 Используйте эту ссылку: https://t.me/InvittingToTGbotk_bot?start=${latest.verification_token}`);
  console.log(`3. 📱 Отправьте этот номер: ${latest.phone}`);
  console.log('4. 📋 Проверьте логи сервера: pm2 logs russkii-portal --lines 30');
} 