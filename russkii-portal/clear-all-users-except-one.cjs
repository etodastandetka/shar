const Database = require('better-sqlite3');
const path = require('path');

const KEEP_EMAIL = 'fortnite08qwer@gmail.com';

console.log('🗑️ УДАЛЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ КРОМЕ ОДНОГО');
console.log(`📌 Сохраняем: ${KEEP_EMAIL}`);

try {
  // Открываем базу данных
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  const db = new Database(dbPath);

  // Получаем ID пользователя, которого нужно оставить
  const keepUser = db.prepare('SELECT id, email FROM users WHERE email = ?').get(KEEP_EMAIL);
  
  if (!keepUser) {
    console.log(`❌ Пользователь ${KEEP_EMAIL} не найден!`);
    process.exit(1);
  }

  console.log(`✅ Найден пользователь для сохранения: ID ${keepUser.id} - ${keepUser.email}`);

  // Получаем всех пользователей для удаления
  const usersToDelete = db.prepare('SELECT id, email FROM users WHERE email != ?').all(KEEP_EMAIL);
  
  console.log(`📊 Всего пользователей для удаления: ${usersToDelete.length}`);

  if (usersToDelete.length === 0) {
    console.log('✨ Нет пользователей для удаления');
    db.close();
    process.exit(0);
  }

  // Показываем список для удаления
  console.log('\n🗂️ Список пользователей для удаления:');
  usersToDelete.forEach((user, index) => {
    console.log(`   ${index + 1}. ID ${user.id} - ${user.email}`);
  });

  console.log('\n🧹 Начинаем очистку...');

  // Удаляем связанные данные для каждого пользователя
  let totalDeleted = 0;

  for (const user of usersToDelete) {
    console.log(`\n📋 Удаляем данные пользователя: ${user.email} (ID: ${user.id})`);

    try {
      // 1. Удаляем заказы
      const ordersResult = db.prepare('DELETE FROM orders WHERE user_id = ?').run(user.id);
      console.log(`   🛒 Удалено заказов: ${ordersResult.changes}`);

      // 2. Удаляем отзывы
      const reviewsResult = db.prepare('DELETE FROM reviews WHERE user_id = ?').run(user.id);
      console.log(`   ⭐ Удалено отзывов: ${reviewsResult.changes}`);

      // 3. Удаляем из pending_registrations по email
      const pendingResult = db.prepare('DELETE FROM pending_registrations WHERE user_data LIKE ?').run(`%${user.email}%`);
      console.log(`   ⏳ Удалено ожидающих регистраций: ${pendingResult.changes}`);

      // 4. Удаляем самого пользователя
      const userResult = db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      console.log(`   👤 Удален пользователь: ${userResult.changes > 0 ? 'ДА' : 'НЕТ'}`);

      if (userResult.changes > 0) {
        totalDeleted++;
      }

    } catch (error) {
      console.error(`   ❌ Ошибка при удалении пользователя ${user.email}:`, error.message);
    }
  }

  console.log(`\n✅ ЗАВЕРШЕНО!`);
  console.log(`📊 Статистика:`);
  console.log(`   • Пользователей удалено: ${totalDeleted}`);
  console.log(`   • Оставлен пользователь: ${KEEP_EMAIL}`);

  // Проверяем результат
  const remainingUsers = db.prepare('SELECT id, email FROM users').all();
  console.log(`\n👥 Оставшиеся пользователи (${remainingUsers.length}):`);
  remainingUsers.forEach(user => {
    console.log(`   • ID ${user.id} - ${user.email}`);
  });

  db.close();
  console.log('\n🎉 Очистка завершена успешно!');

} catch (error) {
  console.error('❌ Ошибка:', error);
  process.exit(1);
} 