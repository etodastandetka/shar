const Database = require('better-sqlite3');
const path = require('path');

console.log('🧹 ОЧИСТКА СЕССИЙ');

try {
  // Очищаем database.sqlite - pending_registrations
  const dbPath = path.join(__dirname, 'db', 'database.sqlite');
  const db = new Database(dbPath);
  
  const pendingResult = db.prepare('DELETE FROM pending_registrations').run();
  console.log(`📋 Удалено записей из pending_registrations: ${pendingResult.changes}`);
  db.close();

  // Очищаем sessions.sqlite
  const sessionsPath = path.join(__dirname, 'db', 'sessions.sqlite');
  const sessionsDb = new Database(sessionsPath);
  
  const sessionsResult = sessionsDb.prepare('DELETE FROM sessions').run();
  console.log(`🔐 Удалено сессий: ${sessionsResult.changes}`);
  sessionsDb.close();

  console.log('✅ Все сессии и pending_registrations очищены!');

} catch (error) {
  console.error('❌ Ошибка:', error);
} 