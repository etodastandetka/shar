const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔍 ДИАГНОСТИКА ПРОЦЕССА РЕГИСТРАЦИИ');
console.log('📁 База данных:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения:', err.message);
    return;
  }
  
  console.log('✅ Подключение к базе данных успешно\n');
  
  // Проверяем таблицу pending_registrations
  db.all('SELECT * FROM pending_registrations ORDER BY created_at DESC', (err, pendingRegs) => {
    if (err) {
      if (err.message.includes('no such table')) {
        console.log('❌ Таблица pending_registrations не существует!');
        console.log('💡 Это объясняет, почему токены не сохраняются');
        
        // Создаем таблицу
        console.log('\n🔧 Создание таблицы pending_registrations...');
        
        db.exec(`
          CREATE TABLE IF NOT EXISTS pending_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            user_data TEXT NOT NULL,
            verification_token TEXT NOT NULL,
            verified INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (createErr) => {
          if (createErr) {
            console.error('❌ Ошибка создания таблицы:', createErr);
          } else {
            console.log('✅ Таблица pending_registrations создана успешно');
          }
          
          continueWithUsersCheck();
        });
      } else {
        console.error('❌ Ошибка получения pending_registrations:', err);
        continueWithUsersCheck();
      }
      return;
    }
    
    console.log(`📋 ВРЕМЕННЫЕ РЕГИСТРАЦИИ: ${pendingRegs.length}`);
    
    if (pendingRegs.length > 0) {
      console.log('='.repeat(80));
      pendingRegs.forEach((reg, index) => {
        console.log(`\n${index + 1}. 📞 ${reg.phone}`);
        console.log(`   🔑 Токен: ${reg.verification_token}`);
        console.log(`   ✅ Верифицирован: ${reg.verified ? 'Да' : 'Нет'}`);
        console.log(`   📅 Создан: ${reg.created_at}`);
        
        try {
          const userData = JSON.parse(reg.user_data);
          console.log(`   📧 Email: ${userData.email || 'не указан'}`);
          console.log(`   👤 Имя: ${userData.name || 'не указано'}`);
        } catch (e) {
          console.log(`   📋 Данные: ${reg.user_data}`);
        }
        
        if (reg.verification_token) {
          console.log(`   🔗 Ссылка: https://t.me/jungle_plants_bot?start=${reg.verification_token}`);
        }
      });
    } else {
      console.log('❌ Нет временных регистраций');
    }
    
    continueWithUsersCheck();
  });
  
  function continueWithUsersCheck() {
    // Проверяем таблицу users
    db.all('SELECT * FROM users ORDER BY created_at DESC', (err, users) => {
      if (err) {
        console.error('❌ Ошибка получения пользователей:', err);
        db.close();
        return;
      }
      
      console.log(`\n👥 ПОЛЬЗОВАТЕЛИ В ОСНОВНОЙ ТАБЛИЦЕ: ${users.length}`);
      
      if (users.length > 0) {
        console.log('='.repeat(80));
        users.forEach((user, index) => {
          console.log(`\n${index + 1}. 👤 ${user.email}`);
          console.log(`   🆔 ID: ${user.id}`);
          console.log(`   📞 Телефон: ${user.phone || 'не указан'}`);
          console.log(`   ✅ Верифицирован: ${user.phone_verified ? 'Да' : 'Нет'}`);
          console.log(`   📱 Telegram ID: ${user.telegram_chat_id || 'не установлен'}`);
          console.log(`   🔑 Токен в users: ${user.phone_verification_token || 'НЕТ'}`);
          console.log(`   📅 Создан: ${user.created_at}`);
        });
      }
      
      // Анализ проблем
      console.log('\n' + '='.repeat(80));
      console.log('🔍 АНАЛИЗ ПРОБЛЕМ:');
      
             const activeTokens = pendingRegs.filter(r => !r.verified);
       const verifiedTokens = pendingRegs.filter(r => r.verified);
      const usersWithTokens = users.filter(u => u.phone_verification_token);
      
      console.log(`📝 Активные токены в pending_registrations: ${activeTokens.length}`);
      console.log(`✅ Верифицированные токены в pending_registrations: ${verifiedTokens.length}`);
      console.log(`🔑 Пользователи с токенами в users: ${usersWithTokens.length}`);
      
      if (activeTokens.length > 0) {
        console.log('\n✅ ЕСТЬ АКТИВНЫЕ ТОКЕНЫ! Попробуйте эти ссылки:');
        activeTokens.forEach((token, index) => {
          console.log(`${index + 1}. ${token.phone}: https://t.me/jungle_plants_bot?start=${token.verification_token}`);
        });
      } else {
        console.log('\n❌ НЕТ АКТИВНЫХ ТОКЕНОВ');
        console.log('💡 Причины:');
        console.log('   1. Таблица pending_registrations не существовала');
        console.log('   2. Токены не создаются при регистрации');
        console.log('   3. Токены удаляются преждевременно');
      }
      
      console.log('\n🔧 РЕКОМЕНДАЦИИ:');
      if (activeTokens.length > 0) {
        console.log('✅ Используйте активные ссылки выше');
      } else {
        console.log('1. Зарегистрируйтесь заново на сайте');
        console.log('2. Убедитесь, что таблица pending_registrations создана');
        console.log('3. Проверьте логи регистрации на сервере');
      }
      
      console.log('\n🎯 ТЕСТИРОВАНИЕ:');
      console.log('1. Запустите бота: node server/telegram-bot-final.cjs');
      console.log('2. Зарегистрируйтесь на: https://helens-jungle.ru');
      console.log('3. Проверьте этим скриптом: node debug-registration-flow.cjs');
      console.log('4. Используйте появившуюся ссылку в Telegram');
      
      db.close();
    });
  }
}); 