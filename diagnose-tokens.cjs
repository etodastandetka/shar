const Database = require('better-sqlite3');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function deleteUser() {
  try {
    console.log('🗑️ Интерактивное удаление пользователя из базы данных');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Запрашиваем данные
    const email = await question('📧 Введите email пользователя: ');
    const phone = await question('📱 Введите номер телефона (с +7): ');
    
    console.log('\n🔍 Поиск пользователя...');
    console.log(`Email: ${email}`);
    console.log(`Phone: ${phone}`);
    
    const confirm = await question('\n⚠️ Вы уверены, что хотите удалить ВСЕ данные этого пользователя? (да/нет): ');
    
    if (confirm.toLowerCase() !== 'да' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Операция отменена');
      rl.close();
      return;
    }

    const db = new Database('./db/database.sqlite');
    let totalDeleted = 0;

    console.log('\n🚀 Начинаю удаление...');

    // 1. Сначала найдем user_id для удаления связанных данных
    const user = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
    const userId = user ? user.id : null;

    if (userId) {
      console.log(`👤 Найден пользователь с ID: ${userId}`);
      
      // Удаляем заказы
      const ordersResult = db.prepare('DELETE FROM orders WHERE user_id = ?').run(userId);
      console.log('🛒 Удалено заказов:', ordersResult.changes);
      totalDeleted += ordersResult.changes;

      // Удаляем отзывы (если есть такая таблица)
      try {
        const reviewsResult = db.prepare('DELETE FROM reviews WHERE user_id = ?').run(userId);
        console.log('⭐ Удалено отзывов:', reviewsResult.changes);
        totalDeleted += reviewsResult.changes;
      } catch (e) {
        // Таблица reviews может не существовать
      }
    }

    // 2. Удаляем из users
    const userResult = db.prepare('DELETE FROM users WHERE email = ? OR phone = ?').run(email, phone);
    console.log('👤 Удалено из users:', userResult.changes);
    totalDeleted += userResult.changes;

    // 3. Удаляем из pending_registrations только по телефону
    const pendingResult = db.prepare('DELETE FROM pending_registrations WHERE phone = ?').run(phone);
    console.log('📋 Удалено из pending_registrations:', pendingResult.changes);
    totalDeleted += pendingResult.changes;

    // 4. Поиск по частичному совпадению токена (если есть)
    if (email.includes('@')) {
      const emailPart = email.split('@')[0].substring(0, 8); // Первые 8 символов до @
      const tokenResult = db.prepare('DELETE FROM pending_registrations WHERE verification_token LIKE ?').run(`${emailPart}%`);
      if (tokenResult.changes > 0) {
        console.log(`🔑 Удалено по токену ${emailPart}*:`, tokenResult.changes);
        totalDeleted += tokenResult.changes;
      }
    }

    // 5. Удаляем сессии (если есть)
    try {
      const sessionsDb = new Database('./db/sessions.sqlite');
      const sessionResult = sessionsDb.prepare('DELETE FROM sessions WHERE sess LIKE ?').run(`%${email}%`);
      console.log('🔐 Удалено сессий:', sessionResult.changes);
      totalDeleted += sessionResult.changes;
      sessionsDb.close();
    } catch (e) {
      console.log('ℹ️ Сессии не найдены или база недоступна');
    }

    console.log('\n✅ РЕЗУЛЬТАТ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Всего удалено записей: ${totalDeleted}`);
    
    if (totalDeleted > 0) {
      console.log('🎯 Пользователь полностью удален! Можно регистрироваться заново.');
    } else {
      console.log('⚠️ Пользователь не найден в базе данных');
    }

    db.close();
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    rl.close();
  }
}

// Запускаем
deleteUser(); 