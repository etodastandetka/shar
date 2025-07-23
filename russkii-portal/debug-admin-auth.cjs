const Database = require('better-sqlite3');
const path = require('path');

console.log('🔍 Диагностика проблемы с авторизацией администратора');

try {
  // Подключаемся к базе данных
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  console.log(`📁 Подключение к БД: ${dbPath}`);
  const db = new Database(dbPath);

  // Ищем всех администраторов в системе
  console.log('\n👥 Поиск администраторов в системе:');
  const admins = db.prepare("SELECT * FROM users WHERE is_admin = 1").all();
  
  if (admins.length === 0) {
    console.log('❌ Администраторы не найдены в системе!');
  } else {
    console.log(`✅ Найдено ${admins.length} администратор(ов):`);
    
    admins.forEach((admin, index) => {
      console.log(`\n${index + 1}. Администратор:`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Имя: ${admin.full_name || admin.username || 'Не указано'}`);
      console.log(`   is_admin: ${admin.is_admin}`);
      console.log(`   Создан: ${admin.created_at}`);
      console.log(`   Обновлен: ${admin.updated_at}`);
      
      // Проверяем корректность хеша пароля
      if (admin.password) {
        if (admin.password.includes(':')) {
          console.log(`   ✅ Пароль хеширован корректно`);
        } else {
          console.log(`   ⚠️  Пароль НЕ хеширован (открытый текст)`);
        }
      }
    });
  }

  // Проверяем структуру таблицы users
  console.log('\n🏗️  Структура таблицы users:');
  const columns = db.prepare("PRAGMA table_info(users)").all();
  console.log('Колонки таблицы:');
  columns.forEach(col => {
    console.log(`   ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : 'NO DEFAULT'}`);
  });

  // Проверяем сессии (если таблица существует)
  console.log('\n📊 Проверка активных сессий:');
  try {
    const sessions = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();
    if (sessions) {
      const sessionCount = db.prepare("SELECT COUNT(*) as count FROM sessions").get();
      console.log(`✅ Найдено ${sessionCount.count} активных сессий`);
    } else {
      console.log('ℹ️  Таблица sessions не найдена (сессии хранятся в памяти)');
    }
  } catch (err) {
    console.log('⚠️  Ошибка при проверке сессий:', err.message);
  }

  // Проверяем последние действия в логах (если они есть)
  console.log('\n🔍 Рекомендации по решению проблемы:');
  console.log('1. ✅ Исправлена асинхронная функция ensureAdmin() в routes-sqlite.ts');
  console.log('2. 🔄 Перезапустите сервер для применения изменений');
  console.log('3. 🧹 Очистите кэш браузера и куки сессии');
  console.log('4. 🔐 Попробуйте перелогиниться в админку');
  console.log('5. 📊 Проверьте логи сервера при выполнении действий в админке');

  console.log('\n🔧 Команды для исправления:');
  console.log('   npm run dev (для разработки)');
  console.log('   npm start (для продакшена)');

  db.close();
  console.log('\n✅ Диагностика завершена');

} catch (error) {
  console.error('❌ Ошибка диагностики:', error);
} 