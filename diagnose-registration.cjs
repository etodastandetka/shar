const Database = require('better-sqlite3');
const path = require('path');

console.log('🔍 Диагностика проблем с регистрацией...\n');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new Database(dbPath);

console.log(`📁 База данных: ${dbPath}\n`);

// 1. Проверяем pending_registrations
console.log('📋 1. АНАЛИЗ PENDING_REGISTRATIONS:');
try {
  const pendingRegs = db.prepare(`
    SELECT id, phone, verification_token, verified, created_at,
           datetime(created_at, 'localtime') as local_time
    FROM pending_registrations 
    ORDER BY created_at DESC 
    LIMIT 20
  `).all();
  
  console.log(`   Всего записей: ${pendingRegs.length}`);
  
  if (pendingRegs.length > 0) {
    console.log(`\n   📝 Последние регистрации:`);
    pendingRegs.forEach((reg, index) => {
      const userData = JSON.parse(reg.user_data || '{}');
      console.log(`   ${index + 1}. ID: ${reg.id}`);
      console.log(`      📞 Телефон: ${reg.phone}`);
      console.log(`      📧 Email: ${userData.email || 'не указан'}`);
      console.log(`      🔑 Токен: ${reg.verification_token?.slice(0, 8)}...`);
      console.log(`      ✅ Верифицирован: ${reg.verified ? 'ДА' : 'НЕТ'}`);
      console.log(`      📅 Создан: ${reg.local_time}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️ Нет записей в pending_registrations');
  }
} catch (error) {
  console.log(`   ❌ Ошибка: ${error.message}`);
}

// 2. Проверяем пользователей
console.log('\n👥 2. АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ:');
try {
  const users = db.prepare(`
    SELECT id, email, phone, phone_verified, telegram_chat_id, 
           datetime(created_at, 'localtime') as local_time
    FROM users 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all();
  
  console.log(`   Всего пользователей: ${users.length}`);
  console.log(`   С подтвержденными телефонами: ${users.filter(u => u.phone_verified).length}`);
  console.log(`   С Telegram: ${users.filter(u => u.telegram_chat_id).length}`);
  
  if (users.length > 0) {
    console.log(`\n   👤 Последние пользователи:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      📞 ${user.phone || 'не указан'} ${user.phone_verified ? '✅' : '❌'}`);
      console.log(`      📱 Telegram: ${user.telegram_chat_id || 'не привязан'}`);
      console.log(`      📅 Создан: ${user.local_time}`);
      console.log('');
    });
  }
} catch (error) {
  console.log(`   ❌ Ошибка: ${error.message}`);
}

// 3. Проверяем проблемные номера
console.log('\n📞 3. ПРОВЕРКА ПРОБЛЕМНЫХ НОМЕРОВ:');
const problemPhones = [
  '89055752187', '89177985719', '+7 (906) 177-52-95', 
  '89514601973', '79061520938', '89872530078',
  '89528582942', '+79026573070', '+79296701161', '+79179276626'
];

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
  return normalized;
}

problemPhones.forEach((phone, index) => {
  const normalized = normalizePhone(phone);
  console.log(`\n   ${index + 1}. ${phone} -> ${normalized}`);
  
  // Ищем в users
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalized);
  if (user) {
    console.log(`      ✅ Найден пользователь: ${user.email} (ID: ${user.id})`);
    console.log(`      📱 Телефон верифицирован: ${user.phone_verified ? 'ДА' : 'НЕТ'}`);
  } else {
    console.log(`      ❌ Пользователь не найден в таблице users`);
  }
  
  // Ищем в pending_registrations
  const pending = db.prepare('SELECT * FROM pending_registrations WHERE phone = ?').get(normalized);
  if (pending) {
    const userData = JSON.parse(pending.user_data || '{}');
    console.log(`      ⏳ Найден в pending: ${userData.email}`);
    console.log(`      📱 Верифицирован: ${pending.verified ? 'ДА' : 'НЕТ'}`);
    console.log(`      🔑 Токен: ${pending.verification_token?.slice(0, 8)}...`);
  } else {
    console.log(`      ⚠️ Не найден в pending_registrations`);
  }
});

// 4. Статистика по времени
console.log('\n📊 4. СТАТИСТИКА ПО ВРЕМЕНИ:');
try {
  const stats = db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as registrations,
      SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified_count
    FROM pending_registrations 
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `).all();
  
  if (stats.length > 0) {
    console.log('   📅 Регистрации за последние 7 дней:');
    stats.forEach(stat => {
      console.log(`   ${stat.date}: ${stat.registrations} регистраций, ${stat.verified_count} верифицированы`);
    });
  } else {
    console.log('   ⚠️ Нет регистраций за последние 7 дней');
  }
} catch (error) {
  console.log(`   ❌ Ошибка статистики: ${error.message}`);
}

// 5. Рекомендации
console.log('\n💡 5. РЕКОМЕНДАЦИИ:');

const totalPending = db.prepare('SELECT COUNT(*) as count FROM pending_registrations').get().count;
const unverifiedPending = db.prepare('SELECT COUNT(*) as count FROM pending_registrations WHERE verified = 0').get().count;
const oldPending = db.prepare(`
  SELECT COUNT(*) as count FROM pending_registrations 
  WHERE created_at < datetime('now', '-24 hours')
`).get().count;

console.log(`   📝 Всего в pending_registrations: ${totalPending}`);
console.log(`   ❌ Неверифицированных: ${unverifiedPending}`);
console.log(`   ⏰ Старше 24 часов: ${oldPending}`);

if (unverifiedPending > 0) {
  console.log(`\n   🚨 Обнаружено ${unverifiedPending} неверифицированных регистраций!`);
  console.log(`   💡 Рекомендуется запустить: node fix-registration-manual.cjs`);
}

if (oldPending > 0) {
  console.log(`\n   🧹 Найдено ${oldPending} старых записей`);
  console.log(`   💡 Рекомендуется очистить: DELETE FROM pending_registrations WHERE created_at < datetime('now', '-24 hours')`);
}

db.close();
console.log('\n✅ Диагностика завершена!'); 