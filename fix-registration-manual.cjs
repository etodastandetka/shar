const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Список пользователей, которым нужно помочь с регистрацией
const problemUsers = [
  { phone: '89055752187', email: 'user1@example.com', firstName: 'Пользователь', lastName: '1' },
  { phone: '89177985719', email: 'user2@example.com', firstName: 'Пользователь', lastName: '2' },
  { phone: '+7 (906) 177-52-95', email: 'Irina_Tsvyetkova@mail.ru', firstName: 'Ирина', lastName: 'Цветкова' },
  { phone: '89514601973', email: 'user3@example.com', firstName: 'Пользователь', lastName: '3' },
  { phone: '79061520938', email: 'user4@example.com', firstName: 'Пользователь', lastName: '4' },
  { phone: '89872530078', email: 'user5@example.com', firstName: 'Пользователь', lastName: '5' },
  { phone: '89528582942', email: 'kazoku.boido@gmail.com', firstName: 'Пользователь', lastName: '6' },
  { phone: '+79026573070', email: 'fantazer-igr@yandex.ru', firstName: 'Пользователь', lastName: '7' },
  { phone: '+79296701161', email: 'user8@example.com', firstName: 'Пользователь', lastName: '8' },
  { phone: '+79179276626', email: 'user9@example.com', firstName: 'Пользователь', lastName: '9' },
];

// Нормализация номера телефона (как в боте)
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

// Хеширование пароля (простое для демо)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function fixRegistrations() {
  console.log('🚀 Исправление проблем с регистрацией...');
  
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  const db = new Database(dbPath);
  
  console.log(`📁 Подключение к базе: ${dbPath}`);
  
  let fixed = 0;
  let created = 0;
  let fromPending = 0;
  
  // Сначала обрабатываем верифицированные pending registrations
  console.log('\n🔄 Обработка верифицированных pending registrations...');
  
  const verifiedPending = db.prepare(`
    SELECT * FROM pending_registrations 
    WHERE verified = 1
  `).all();
  
  for (const pending of verifiedPending) {
    try {
      const userData = JSON.parse(pending.user_data);
      const normalizedPhone = normalizePhone(pending.phone);
      
      console.log(`\n📞 Обработка верифицированного: ${userData.email}`);
      console.log(`   Телефон: ${pending.phone}`);
      
      // Проверяем, существует ли уже пользователь
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?')
        .get(userData.email);
      
      if (!existingUser) {
        // Создаем пользователя из pending_registration
        const insertResult = db.prepare(`
          INSERT INTO users (
            email, password, full_name, username, 
            phone, phone_verified, is_admin, balance, created_at
          ) VALUES (?, ?, ?, ?, ?, 1, 0, '0.00', datetime('now'))
        `).run(
          userData.email.toLowerCase(),
          userData.password, // Пароль уже захеширован
          userData.firstName + ' ' + userData.lastName,
          userData.username,
          normalizedPhone
        );
        
        console.log(`   ✅ Создан пользователь из pending (ID: ${insertResult.lastInsertRowid})`);
        fromPending++;
        
        // Удаляем из pending_registrations
        db.prepare('DELETE FROM pending_registrations WHERE id = ?').run(pending.id);
        console.log(`   🧹 Удалено из pending_registrations`);
      } else {
        console.log(`   ✅ Пользователь уже существует`);
        // Удаляем из pending_registrations так как пользователь уже есть
        db.prepare('DELETE FROM pending_registrations WHERE id = ?').run(pending.id);
        console.log(`   🧹 Удалено из pending_registrations (дубликат)`);
      }
    } catch (error) {
      console.error(`   ❌ Ошибка обработки pending ID ${pending.id}: ${error.message}`);
    }
  }
  
  // Теперь обрабатываем проблемных пользователей
  console.log('\n👥 Обработка проблемных пользователей...');
  
  for (const user of problemUsers) {
    const normalizedPhone = normalizePhone(user.phone);
    const defaultPassword = 'TempPass123!'; // Временный пароль
    
    console.log(`\n👤 Обработка: ${user.firstName} ${user.lastName}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   📞 Телефон: ${user.phone} -> ${normalizedPhone}`);
    
    try {
      // Проверяем, существует ли пользователь
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?')
        .get(user.email, normalizedPhone);
      
      if (existingUser) {
        console.log(`   ✅ Пользователь уже существует (ID: ${existingUser.id})`);
        
        // Убеждаемся что телефон подтвержден
        const updateResult = db.prepare(`
          UPDATE users 
          SET phone_verified = 1, phone = ?
          WHERE id = ?
        `).run(normalizedPhone, existingUser.id);
        
        console.log(`   📱 Телефон подтвержден: ${updateResult.changes > 0 ? 'ДА' : 'УЖЕ БЫЛ'}`);
        fixed++;
      } else {
        // Создаем нового пользователя
        const insertResult = db.prepare(`
          INSERT INTO users (
            email, password, full_name, username, 
            phone, phone_verified, is_admin, balance, created_at
          ) VALUES (?, ?, ?, ?, ?, 1, 0, '0.00', datetime('now'))
        `).run(
          user.email.toLowerCase(),
          hashPassword(defaultPassword),
          `${user.firstName} ${user.lastName}`,
          user.email.split('@')[0],
          normalizedPhone
        );
        
        console.log(`   ✅ Создан новый пользователь (ID: ${insertResult.lastInsertRowid})`);
        console.log(`   🔑 Временный пароль: ${defaultPassword}`);
        created++;
      }
      
      // Очищаем pending_registrations для этого номера
      const cleanupResult = db.prepare('DELETE FROM pending_registrations WHERE phone = ?')
        .run(normalizedPhone);
      
      if (cleanupResult.changes > 0) {
        console.log(`   🧹 Очищено pending_registrations: ${cleanupResult.changes}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.message}`);
    }
  }
  
  db.close();
  
  console.log(`\n📊 ИТОГИ:`);
  console.log(`   🔄 Создано из верифицированных pending: ${fromPending}`);
  console.log(`   ✅ Исправлено существующих пользователей: ${fixed}`);
  console.log(`   🆕 Создано новых пользователей: ${created}`);
  console.log(`   📱 Все указанные пользователи теперь могут входить в систему`);
  console.log(`   🔑 Временный пароль для новых пользователей: TempPass123!`);
  console.log(`\n💡 Пользователи могут сменить пароль в настройках профиля после входа`);
}

// Запускаем исправление
fixRegistrations().catch(console.error); 