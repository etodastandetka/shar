const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔍 ДИАГНОСТИКА НА СЕРВЕРЕ');
console.log('📁 База данных:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения:', err.message);
    return;
  }
  
  console.log('✅ Подключение к базе данных успешно\n');
  
  // Проверяем pending_registrations
  db.all('SELECT * FROM pending_registrations ORDER BY created_at DESC LIMIT 10', (err, pendingRegs) => {
    if (err) {
      console.error('❌ Ошибка получения pending_registrations:', err);
      return;
    }
    
    console.log(`📋 ВРЕМЕННЫЕ РЕГИСТРАЦИИ: ${pendingRegs.length}`);
    console.log('='.repeat(80));
    
    pendingRegs.forEach((reg, index) => {
      console.log(`\n${index + 1}. 📞 ${reg.phone}`);
      console.log(`   🔑 Токен: ${reg.verification_token}`);
      console.log(`   ✅ Верифицирован: ${reg.verified ? 'Да' : 'Нет'}`);
      console.log(`   📅 Создан: ${reg.created_at}`);
      
      try {
        const userData = JSON.parse(reg.user_data);
        console.log(`   📧 Email: ${userData.email || 'не указан'}`);
        console.log(`   👤 Имя: ${userData.name || userData.firstName || 'не указано'}`);
      } catch (e) {
        console.log(`   📋 Данные: ${reg.user_data.substring(0, 100)}...`);
      }
      
      console.log(`   🔗 Ссылка: https://t.me/jungle_plants_bot?start=${reg.verification_token}`);
    });
    
    // Проверяем users
    db.all('SELECT * FROM users ORDER BY created_at DESC LIMIT 10', (err2, users) => {
      if (err2) {
        console.error('❌ Ошибка получения пользователей:', err2);
        return;
      }
      
      console.log(`\n👥 ПОЛЬЗОВАТЕЛИ В ТАБЛИЦЕ USERS: ${users.length}`);
      console.log('='.repeat(80));
      
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. 👤 ${user.email}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   📞 Телефон: ${user.phone || 'не указан'}`);
        console.log(`   ✅ Верифицирован: ${user.phone_verified ? 'Да' : 'Нет'}`);
        console.log(`   📱 Telegram ID: ${user.telegram_chat_id || 'не установлен'}`);
        console.log(`   📅 Создан: ${user.created_at}`);
      });
      
      // Анализ соответствий
      console.log('\n' + '='.repeat(80));
      console.log('🔍 АНАЛИЗ СООТВЕТСТВИЙ:');
      
      pendingRegs.forEach((pending, index) => {
        try {
          const userData = JSON.parse(pending.user_data);
          const email = userData.email;
          const phone = pending.phone;
          
          const matchingUser = users.find(u => 
            u.email === email || u.phone === phone
          );
          
          console.log(`\n${index + 1}. Pending: ${email} (${phone})`);
          if (matchingUser) {
            console.log(`   ✅ Найден пользователь: ${matchingUser.email} (ID: ${matchingUser.id})`);
            console.log(`   📱 Telegram ID: ${matchingUser.telegram_chat_id || 'не установлен'}`);
            console.log(`   ✅ Верифицирован: ${matchingUser.phone_verified ? 'Да' : 'Нет'}`);
          } else {
            console.log(`   ❌ Пользователь НЕ НАЙДЕН в таблице users!`);
            console.log(`   💡 Возможно, регистрация не завершена`);
          }
        } catch (e) {
          console.log(`   ❌ Ошибка парсинга данных: ${pending.user_data}`);
        }
      });
      
      console.log('\n' + '='.repeat(80));
      console.log('💡 РЕКОМЕНДАЦИИ:');
      
      const unmatchedPending = pendingRegs.filter(pending => {
        try {
          const userData = JSON.parse(pending.user_data);
          const email = userData.email;
          const phone = pending.phone;
          return !users.find(u => u.email === email || u.phone === phone);
        } catch (e) {
          return true;
        }
      });
      
      if (unmatchedPending.length > 0) {
        console.log('❌ ЕСТЬ НЕЗАВЕРШЕННЫЕ РЕГИСТРАЦИИ!');
        console.log('🔧 Эти пользователи есть в pending_registrations, но НЕТ в users:');
        
        unmatchedPending.forEach((pending, index) => {
          try {
            const userData = JSON.parse(pending.user_data);
            console.log(`${index + 1}. ${userData.email} - ${pending.phone}`);
            console.log(`   Токен: ${pending.verification_token}`);
            console.log(`   Ссылка: https://t.me/jungle_plants_bot?start=${pending.verification_token}`);
          } catch (e) {
            console.log(`${index + 1}. Ошибка данных: ${pending.phone}`);
          }
        });
        
        console.log('\n💻 РЕШЕНИЯ:');
        console.log('1. Завершите регистрацию на сайте для этих пользователей');
        console.log('2. Или создайте пользователей в таблице users вручную');
        console.log('3. Или используйте бота для автоматического создания пользователей');
      } else {
        console.log('✅ Все регистрации имеют соответствующих пользователей');
      }
      
      db.close();
    });
  });
}); 