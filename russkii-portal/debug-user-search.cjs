const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔍 ДИАГНОСТИКА ПОИСКА ПОЛЬЗОВАТЕЛЯ');
console.log('📁 База данных:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения:', err.message);
    return;
  }
  
  console.log('✅ Подключение к базе данных успешно\n');
  
  // Получаем всех пользователей
  db.all('SELECT * FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) {
      console.error('❌ Ошибка получения пользователей:', err);
      db.close();
      return;
    }
    
    console.log(`👥 Всего пользователей в базе: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('❌ В базе данных нет пользователей!');
      console.log('💡 Зарегистрируйтесь на сайте: https://helens-jungle.ru\n');
      db.close();
      return;
    }
    
    console.log('📋 СОСТОЯНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ:');
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. 👤 ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   📞 Телефон: ${user.phone || '❌ не указан'}`);
      console.log(`   ✅ Верифицирован: ${user.phone_verified ? '✅ Да' : '❌ Нет'}`);
      console.log(`   📱 Telegram ID: ${user.telegram_chat_id || '❌ не установлен'}`);
      console.log(`   🔑 Токен: ${user.phone_verification_token ? '✅ есть' : '❌ нет'}`);
      console.log(`   📅 Создан: ${user.created_at}`);
      console.log(`   🔄 Обновлен: ${user.updated_at || 'не указано'}`);
      
      // Анализ состояния
      const issues = [];
      const suggestions = [];
      
      if (!user.phone_verified && !user.phone_verification_token) {
        issues.push('Нет токена верификации');
        suggestions.push('Перерегистрируйтесь на сайте');
      }
      
      if (user.phone_verified && user.phone_verification_token) {
        issues.push('Токен не удален после верификации');
        suggestions.push('Требуется очистка токена');
      }
      
      if (!user.telegram_chat_id && user.phone_verified) {
        issues.push('Верифицирован, но не связан с Telegram');
        suggestions.push('Перейдите по ссылке верификации в Telegram еще раз');
      }
      
      if (user.phone_verification_token && !user.phone_verified) {
        console.log(`   🔗 Ссылка верификации: https://t.me/jungle_plants_bot?start=${user.phone_verification_token}`);
      }
      
      if (issues.length > 0) {
        console.log(`   ⚠️ Проблемы: ${issues.join(', ')}`);
        console.log(`   💡 Решения: ${suggestions.join(', ')}`);
      } else {
        console.log(`   ✅ Состояние корректно`);
      }
    });
    
    // Поиск проблемных пользователей
    const usersWithTokenButNotVerified = users.filter(u => u.phone_verification_token && !u.phone_verified);
    const verifiedUsers = users.filter(u => u.phone_verified);
    const usersWithTelegram = users.filter(u => u.telegram_chat_id);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 СТАТИСТИКА:');
    console.log(`📝 Пользователи с токеном (не верифицированы): ${usersWithTokenButNotVerified.length}`);
    console.log(`✅ Верифицированные пользователи: ${verifiedUsers.length}`);
    console.log(`📱 Пользователи с Telegram: ${usersWithTelegram.length}`);
    
    if (usersWithTokenButNotVerified.length > 0) {
      console.log('\n🔗 АКТИВНЫЕ ССЫЛКИ ВЕРИФИКАЦИИ:');
      usersWithTokenButNotVerified.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}:`);
        console.log(`   https://t.me/jungle_plants_bot?start=${user.phone_verification_token}`);
      });
    }
    
    // Поиск недавних пользователей
    const recentUsers = users.filter(user => {
      const createdAt = new Date(user.created_at);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      return createdAt > twoHoursAgo;
    });
    
    if (recentUsers.length > 0) {
      console.log(`\n⏰ НЕДАВНИЕ ПОЛЬЗОВАТЕЛИ (последние 2 часа): ${recentUsers.length}`);
      recentUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - ${user.created_at}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🔧 РЕКОМЕНДАЦИИ:');
    
    if (usersWithTokenButNotVerified.length > 0) {
      console.log('✅ У вас есть пользователи с активными токенами');
      console.log('📱 Используйте ссылки выше для верификации');
    } else if (verifiedUsers.length > 0) {
      console.log('✅ У вас есть верифицированные пользователи');
      console.log('🔄 Попробуйте запустить /start в боте без токена');
    } else {
      console.log('❌ Нет активных токенов верификации');
      console.log('🆕 Зарегистрируйтесь заново на сайте');
    }
    
    console.log('\n🤖 Для запуска бота: node server/telegram-bot-final.cjs');
    console.log('🗑️ Для удаления пользователя: node quick-delete.cjs');
    console.log('🔧 Для исправления схемы БД: node fix-database-schema.cjs');
    
    db.close();
  });
}); 