const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔧 МАССОВОЕ ИСПРАВЛЕНИЕ ВЕРИФИКАЦИИ ТЕЛЕФОНОВ');
console.log('📁 База данных:', DB_PATH);
console.log('=' * 50);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
    return;
  }
});

// Функция нормализации номера телефона (копия из phone-verification.ts)
function normalizePhone(phone) {
  if (!phone) return null;
  
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

console.log('🔍 Ищем пользователей с подтвержденными телефонами в users...');

// Находим всех пользователей с подтвержденными телефонами
db.all(
  'SELECT id, email, phone, phone_verified FROM users WHERE phone_verified = 1 AND phone IS NOT NULL',
  [],
  (err, verifiedUsers) => {
    if (err) {
      console.error('❌ Ошибка поиска пользователей:', err.message);
      db.close();
      return;
    }

    console.log(`📋 Найдено пользователей с подтвержденными телефонами: ${verifiedUsers.length}`);

    if (verifiedUsers.length === 0) {
      console.log('✅ Нет пользователей для обработки');
      db.close();
      return;
    }

    let processedCount = 0;
    let updatedCount = 0;

    // Обрабатываем каждого пользователя
    verifiedUsers.forEach((user, index) => {
      const normalizedPhone = normalizePhone(user.phone);
      
      console.log(`\n${index + 1}. Обработка пользователя:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Оригинальный телефон: ${user.phone}`);
      console.log(`   Нормализованный телефон: ${normalizedPhone}`);

      // Проверяем, есть ли запись в pending_registrations
      db.get(
        'SELECT * FROM pending_registrations WHERE phone = ?',
        [normalizedPhone],
        (err2, pendingReg) => {
          if (err2) {
            console.error(`   ❌ Ошибка поиска в pending_registrations: ${err2.message}`);
          } else if (pendingReg) {
            if (pendingReg.verified === 0) {
              // Обновляем запись как верифицированную
              db.run(
                'UPDATE pending_registrations SET verified = 1 WHERE phone = ?',
                [normalizedPhone],
                function(err3) {
                  if (err3) {
                    console.error(`   ❌ Ошибка обновления: ${err3.message}`);
                  } else {
                    console.log(`   ✅ Обновлено записей в pending_registrations: ${this.changes}`);
                    updatedCount += this.changes;
                  }
                  
                  processedCount++;
                  if (processedCount === verifiedUsers.length) {
                    finishProcessing();
                  }
                }
              );
            } else {
              console.log(`   ✅ Запись уже верифицирована`);
              processedCount++;
              if (processedCount === verifiedUsers.length) {
                finishProcessing();
              }
            }
          } else {
            console.log(`   ⚠️ Запись не найдена в pending_registrations`);
            processedCount++;
            if (processedCount === verifiedUsers.length) {
              finishProcessing();
            }
          }
        }
      );
    });

    function finishProcessing() {
      console.log('\n' + '=' * 50);
      console.log('🎉 ОБРАБОТКА ЗАВЕРШЕНА!');
      console.log(`📊 Обработано пользователей: ${processedCount}`);
      console.log(`✅ Обновлено записей: ${updatedCount}`);
      console.log('\n💡 Теперь все пользователи с подтвержденными телефонами');
      console.log('   должны корректно проходить верификацию на сайте!');
      
      // Показываем статистику
      db.get(
        `SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN phone_verified = 1 THEN 1 ELSE 0 END) as verified_users
         FROM users WHERE phone IS NOT NULL`,
        [],
        (err, stats) => {
          if (!err && stats) {
            console.log(`\n📈 СТАТИСТИКА:`);
            console.log(`   Всего пользователей с телефонами: ${stats.total_users}`);
            console.log(`   Верифицированных: ${stats.verified_users}`);
          }
          db.close();
        }
      );
    }
  }
); 