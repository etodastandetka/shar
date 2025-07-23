const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('crypto');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔧 АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ');
console.log('📁 База данных:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения:', err.message);
    return;
  }
  
  console.log('✅ Подключение к базе данных успешно\n');
  
  // Получаем все записи из pending_registrations
  db.all('SELECT * FROM pending_registrations ORDER BY created_at DESC', (err, pendingRegs) => {
    if (err) {
      console.error('❌ Ошибка получения pending_registrations:', err);
      db.close();
      return;
    }
    
    // Получаем всех пользователей
    db.all('SELECT * FROM users', (err2, users) => {
      if (err2) {
        console.error('❌ Ошибка получения пользователей:', err2);
        db.close();
        return;
      }
      
      console.log(`📋 Найдено регистраций: ${pendingRegs.length}`);
      console.log(`👥 Найдено пользователей: ${users.length}\n`);
      
      // Ищем регистрации без соответствующих пользователей
      const missingUsers = [];
      
      pendingRegs.forEach(pending => {
        try {
          const userData = JSON.parse(pending.user_data);
          const email = userData.email;
          const phone = pending.phone;
          
          // Проверяем, есть ли пользователь с таким email или телефоном
          const existingUser = users.find(u => 
            u.email === email || u.phone === phone
          );
          
          if (!existingUser) {
            missingUsers.push({
              pending,
              userData
            });
          }
        } catch (e) {
          console.error(`❌ Ошибка парсинга данных для ${pending.phone}:`, e);
        }
      });
      
      if (missingUsers.length === 0) {
        console.log('✅ Все регистрации имеют соответствующих пользователей');
        db.close();
        return;
      }
      
      console.log(`🔧 Найдено ${missingUsers.length} регистраций без пользователей:`);
      
      // Создаем пользователей
      let created = 0;
      let errors = 0;
      
      const createUser = (index) => {
        if (index >= missingUsers.length) {
          console.log(`\n📊 Результат:`);
          console.log(`✅ Создано пользователей: ${created}`);
          console.log(`❌ Ошибок: ${errors}`);
          db.close();
          return;
        }
        
        const { pending, userData } = missingUsers[index];
        const userId = uuidv4();
        const hashedPassword = '$2b$10$defaulthashedpassword'; // Временный пароль
        
        console.log(`\n${index + 1}. Создание пользователя: ${userData.email}`);
        console.log(`   📞 Телефон: ${pending.phone}`);
        console.log(`   🔑 Токен: ${pending.verification_token}`);
        
        const insertUserSql = `
          INSERT INTO users (
            id, email, password, phone, phone_verified, 
            phone_verification_token, telegram_chat_id, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        
        db.run(
          insertUserSql,
          [
            userId,
            userData.email,
            hashedPassword,
            pending.phone,
            0, // Не верифицирован пока
            pending.verification_token, // Токен верификации
            null // Telegram ID установим после верификации
          ],
          function(insertErr) {
            if (insertErr) {
              console.error(`   ❌ Ошибка создания: ${insertErr.message}`);
              errors++;
            } else {
              console.log(`   ✅ Создан с ID: ${userId}`);
              console.log(`   🔗 Ссылка: https://t.me/jungle_plants_bot?start=${pending.verification_token}`);
              created++;
            }
            
            // Переходим к следующему
            createUser(index + 1);
          }
        );
      };
      
      // Начинаем создание
      createUser(0);
    });
  });
}); 