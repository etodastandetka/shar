import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'db', 'database.sqlite');
const db = new Database(dbPath);

// Создаем таблицу для временных регистраций, если она не существует
db.exec(`
  CREATE TABLE IF NOT EXISTS pending_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    user_data TEXT NOT NULL,
    verification_token TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Нормализация номера телефона
function normalizePhone(phone: string): string {
  // Удаляем все символы кроме цифр и плюса
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Если номер начинается с 8, заменяем на +7
  if (normalized.startsWith('8')) {
    normalized = '+7' + normalized.slice(1);
  }
  
  // Если номер начинается с 7 (без +), добавляем +
  if (normalized.startsWith('7') && !normalized.startsWith('+7')) {
    normalized = '+' + normalized;
  }
  
  // Если номер не начинается с +7, но содержит 11 цифр и начинается с 7
  if (!normalized.startsWith('+') && normalized.length === 11 && normalized.startsWith('7')) {
    normalized = '+' + normalized;
  }
  
  // Если номер содержит 10 цифр (без кода страны), добавляем +7
  if (!normalized.startsWith('+') && normalized.length === 10) {
    normalized = '+7' + normalized;
  }
  
  console.log(`📞 Нормализация номера: "${phone}" -> "${normalized}"`);
  return normalized;
}

// Сохранение данных для подтверждения с токеном
export function savePendingRegistration(phone: string, userData: any, verificationToken: string): boolean {
  try {
    const normalizedPhone = normalizePhone(phone);
    
    console.log(`💾 Сохранение данных регистрации:`);
    console.log(`   Исходный номер: ${phone}`);
    console.log(`   Нормализованный номер: ${normalizedPhone}`);
    console.log(`   Токен: ${verificationToken}`);
    console.log(`   Данные пользователя:`, userData);
    
    // Удаляем старые записи для этого номера
    const deleteStmt = db.prepare('DELETE FROM pending_registrations WHERE phone = ?');
    const deleteResult = deleteStmt.run(normalizedPhone);
    console.log(`   Удалено старых записей: ${deleteResult.changes}`);
    
    // Вставляем новую запись
    const insertStmt = db.prepare(`
      INSERT INTO pending_registrations (phone, user_data, verification_token, verified)
      VALUES (?, ?, ?, 0)
    `);
    
    const result = insertStmt.run(normalizedPhone, JSON.stringify(userData), verificationToken);
    console.log(`   Вставлено записей: ${result.changes}`);
    console.log(`   ID новой записи: ${result.lastInsertRowid}`);
    
    const success = result.changes > 0;
    console.log(`   Результат: ${success ? 'УСПЕШНО' : 'ОШИБКА'}`);
    
    return success;
  } catch (error) {
    console.error('❌ Ошибка при сохранении данных регистрации:', error);
    return false;
  }
}

// Проверка подтверждения телефона с токеном
export function checkPhoneVerification(phone: string, verificationToken: string): boolean {
  try {
    const normalizedPhone = normalizePhone(phone);
    
    const stmt = db.prepare(`
      SELECT verified FROM pending_registrations 
      WHERE phone = ? AND verification_token = ?
    `);
    
    const result = stmt.get(normalizedPhone, verificationToken) as { verified: number } | undefined;
    return result ? result.verified === 1 : false;
  } catch (error) {
    console.error('Ошибка при проверке верификации:', error);
    return false;
  }
}

// Пометка телефона как подтвержденного с токеном
export function markPhoneAsVerified(phone: string, verificationToken: string): boolean {
  try {
    const normalizedPhone = normalizePhone(phone);
    
    console.log(`🔍 ПОПЫТКА ПОДТВЕРЖДЕНИЯ ТЕЛЕФОНА:`);
    console.log(`   Исходный номер: "${phone}"`);
    console.log(`   Нормализованный номер: "${normalizedPhone}"`);
    console.log(`   Токен: "${verificationToken}"`);
    
    // 1. Сначала ищем точно по номеру и токену
    let stmt = db.prepare(`
      SELECT * FROM pending_registrations 
      WHERE phone = ? AND verification_token = ?
    `);
    
    let result = stmt.get(normalizedPhone, verificationToken) as any;
    console.log(`   Поиск по точному номеру и токену:`, result ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
    
    // 2. Если не найдено, ищем только по токену
    if (!result) {
      console.log(`   Пытаемся найти только по токену...`);
      stmt = db.prepare(`
        SELECT * FROM pending_registrations 
        WHERE verification_token = ?
      `);
      
      result = stmt.get(verificationToken) as any;
      console.log(`   Поиск только по токену:`, result ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
      
      if (result && result.phone) {
        console.log(`   Найденный номер в базе: "${result.phone}"`);
        console.log(`   Сравнение номеров: "${normalizedPhone}" vs "${result.phone}"`);
        
        // Проверяем различные варианты номера
        const phoneVariants = [
          phone,
          normalizedPhone,
          phone.replace(/[^\d]/g, ''), // только цифры
          '+7' + phone.replace(/[^\d]/g, '').slice(-10), // +7 + последние 10 цифр
          '8' + phone.replace(/[^\d]/g, '').slice(-10), // 8 + последние 10 цифр
        ];
        
        console.log(`   Проверяем варианты:`, phoneVariants);
        
        // Если номер в базе совпадает с одним из вариантов
        if (phoneVariants.includes(result.phone)) {
          console.log(`   ✅ Номер совпадает с одним из вариантов`);
          
          // Обновляем запись
          const updateStmt = db.prepare(`
            UPDATE pending_registrations 
            SET verified = 1 
            WHERE verification_token = ?
          `);
          
          const updateResult = updateStmt.run(verificationToken);
          console.log(`   Обновлено записей: ${updateResult.changes}`);
          return updateResult.changes > 0;
        }
      }
    }
    
    // 3. Если найдена точная запись, обновляем её
    if (result) {
      console.log(`   ✅ Найдена запись для обновления`);
      
      const updateStmt = db.prepare(`
        UPDATE pending_registrations 
        SET verified = 1 
        WHERE phone = ? AND verification_token = ?
      `);
      
      const updateResult = updateStmt.run(normalizedPhone, verificationToken);
      console.log(`   Обновлено записей: ${updateResult.changes}`);
      return updateResult.changes > 0;
    }
    
    // 4. Если ничего не найдено, показываем что есть в базе
    console.log(`   ❌ Запись не найдена. Показываем все pending registrations:`);
    const allStmt = db.prepare('SELECT * FROM pending_registrations ORDER BY created_at DESC LIMIT 5');
    const allResults = allStmt.all() as any[];
    
    allResults.forEach((record: any, index: number) => {
      console.log(`   ${index + 1}. Phone: "${record.phone}", Token: "${record.verification_token}", Verified: ${record.verified}`);
    });
    
    return false;
    
  } catch (error) {
    console.error('❌ Ошибка при подтверждении телефона:', error);
    return false;
  }
}

// Получение данных пользователя после подтверждения с токеном
export function getPendingRegistrationData(phone: string, verificationToken: string): any | null {
  try {
    const normalizedPhone = normalizePhone(phone);
    
    const stmt = db.prepare(`
      SELECT user_data FROM pending_registrations 
      WHERE phone = ? AND verification_token = ? AND verified = 1
    `);
    
    const result = stmt.get(normalizedPhone, verificationToken) as { user_data: string } | undefined;
    return result ? JSON.parse(result.user_data) : null;
  } catch (error) {
    console.error('Ошибка при получении данных регистрации:', error);
    return null;
  }
}

// Удаление временной записи с токеном
export function removePendingRegistration(phone: string, verificationToken: string): boolean {
  try {
    const normalizedPhone = normalizePhone(phone);
    
    const stmt = db.prepare('DELETE FROM pending_registrations WHERE phone = ? AND verification_token = ?');
    const result = stmt.run(normalizedPhone, verificationToken);
    return result.changes > 0;
  } catch (error) {
    console.error('Ошибка при удалении данных регистрации:', error);
    return false;
  }
}

// Очистка старых записей (старше 24 часов)
export function cleanupOldRegistrations(): number {
  try {
    const stmt = db.prepare(`
      DELETE FROM pending_registrations 
      WHERE created_at < datetime('now', '-24 hours')
    `);
    
    const result = stmt.run();
    return result.changes;
  } catch (error) {
    console.error('Ошибка при очистке старых записей:', error);
    return 0;
  }
}

// Получение токена по номеру телефона (для поиска в Telegram боте)
export function getVerificationTokenByPhone(phone: string): string | null {
  try {
    const normalizedPhone = normalizePhone(phone);
    
    const stmt = db.prepare(`
      SELECT verification_token FROM pending_registrations 
      WHERE phone = ? AND verified = 0
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    const result = stmt.get(normalizedPhone) as { verification_token: string } | undefined;
    return result ? result.verification_token : null;
  } catch (error) {
    console.error('Ошибка при получении токена верификации:', error);
    return null;
  }
}

// Функция для отладки - получение всех записей по токену
export function checkPendingRegistrations(verificationToken: string): any {
  try {
    const stmt = db.prepare(`
      SELECT * FROM pending_registrations 
      WHERE verification_token = ?
    `);
    
    const result = stmt.get(verificationToken);
    return result;
  } catch (error) {
    console.error('Ошибка при проверке записей:', error);
    return null;
  }
}

// Автоматическая очистка при запуске
cleanupOldRegistrations();