const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔄 Обновление полей Ozon Pay в базе данных...');
console.log('📁 Путь к базе данных:', dbPath);

let db;
try {
  console.log('🔌 Попытка подключения к базе данных...');
  db = new Database(dbPath);
  console.log('✅ Подключение к базе данных установлено');
} catch (error) {
  console.error('❌ Ошибка подключения к базе данных:', error);
  console.error('Детали ошибки:', error.message);
  process.exit(1);
}

try {
  // Check if balance_topups table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='balance_topups'
  `).get();

  if (!tableExists) {
    console.log('📋 Создание таблицы balance_topups...');
    
    // Create balance_topups table
    db.exec(`
      CREATE TABLE balance_topups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        ozonpay_payment_id TEXT,
        ozonpay_payment_url TEXT,
        ozonpay_transaction_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_proof_url TEXT,
        admin_comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    
    console.log('✅ Таблица balance_topups создана');
  } else {
    console.log('📋 Таблица balance_topups уже существует, обновляем поля...');
    
    // Check and add ozonpay fields if they don't exist
    const tableInfo = db.prepare('PRAGMA table_info(balance_topups)').all();
    const columnNames = tableInfo.map(col => col.name);
    
    console.log('📊 Текущие поля в balance_topups:', columnNames);
    
    if (!columnNames.includes('ozonpay_payment_id')) {
      db.exec('ALTER TABLE balance_topups ADD COLUMN ozonpay_payment_id TEXT');
      console.log('➕ Добавлено поле ozonpay_payment_id');
    } else {
      console.log('✓ Поле ozonpay_payment_id уже существует');
    }
    
    if (!columnNames.includes('ozonpay_payment_url')) {
      db.exec('ALTER TABLE balance_topups ADD COLUMN ozonpay_payment_url TEXT');
      console.log('➕ Добавлено поле ozonpay_payment_url');
    } else {
      console.log('✓ Поле ozonpay_payment_url уже существует');
    }
    
    if (!columnNames.includes('ozonpay_transaction_id')) {
      db.exec('ALTER TABLE balance_topups ADD COLUMN ozonpay_transaction_id TEXT');
      console.log('➕ Добавлено поле ozonpay_transaction_id');
    } else {
      console.log('✓ Поле ozonpay_transaction_id уже существует');
    }
    
    // Remove old payment_id and payment_url fields if they exist
    if (columnNames.includes('payment_id') || columnNames.includes('payment_url')) {
      console.log('🔄 Переименование старых полей...');
      
      // Drop temp table if it exists from previous run
      try {
        db.exec('DROP TABLE IF EXISTS balance_topups_new');
      } catch (e) {
        // Ignore errors
      }
      
      // Create new table with correct structure
      db.exec(`
        CREATE TABLE balance_topups_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          ozonpay_payment_id TEXT,
          ozonpay_payment_url TEXT,
          ozonpay_transaction_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          payment_proof_url TEXT,
          admin_comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);
      
      // Copy data, mapping old fields to new ones
      db.exec(`
        INSERT INTO balance_topups_new (
          id, user_id, amount, payment_method, ozonpay_payment_id, ozonpay_payment_url,
          status, payment_proof_url, admin_comment, created_at, updated_at
        )
        SELECT 
          id, user_id, amount, payment_method, 
          CASE WHEN payment_id IS NOT NULL THEN payment_id ELSE ozonpay_payment_id END,
          CASE WHEN payment_url IS NOT NULL THEN payment_url ELSE ozonpay_payment_url END,
          status, 
          proof_url,
          admin_comment, created_at, updated_at
        FROM balance_topups;
      `);
      
      // Replace old table
      db.exec('DROP TABLE balance_topups');
      db.exec('ALTER TABLE balance_topups_new RENAME TO balance_topups');
      
      console.log('✅ Старые поля переименованы');
    }
  }
  
  // Check and update orders table for ozonpay fields
  console.log('📋 Проверка полей Ozon Pay в таблице orders...');
  
  const ordersTableInfo = db.prepare('PRAGMA table_info(orders)').all();
  const ordersColumnNames = ordersTableInfo.map(col => col.name);
  
  console.log('📊 Поля в orders связанные с ozonpay:', ordersColumnNames.filter(name => name.includes('ozonpay')));
  
  if (!ordersColumnNames.includes('ozonpay_payment_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN ozonpay_payment_id TEXT');
    console.log('➕ Добавлено поле ozonpay_payment_id в таблицу orders');
  } else {
    console.log('✓ Поле ozonpay_payment_id в orders уже существует');
  }
  
  if (!ordersColumnNames.includes('ozonpay_payment_url')) {
    db.exec('ALTER TABLE orders ADD COLUMN ozonpay_payment_url TEXT');
    console.log('➕ Добавлено поле ozonpay_payment_url в таблицу orders');
  } else {
    console.log('✓ Поле ozonpay_payment_url в orders уже существует');
  }
  
  if (!ordersColumnNames.includes('ozonpay_payment_status')) {
    db.exec('ALTER TABLE orders ADD COLUMN ozonpay_payment_status TEXT');
    console.log('➕ Добавлено поле ozonpay_payment_status в таблицу orders');
  } else {
    console.log('✓ Поле ozonpay_payment_status в orders уже существует');
  }
  
  if (!ordersColumnNames.includes('ozonpay_transaction_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN ozonpay_transaction_id TEXT');
    console.log('➕ Добавлено поле ozonpay_transaction_id в таблицу orders');
  } else {
    console.log('✓ Поле ozonpay_transaction_id в orders уже существует');
  }
  
  console.log('✅ Обновление базы данных завершено успешно!');
  console.log('');
  console.log('📝 Следующие шаги:');
  console.log('1. Обновите переменные окружения в файле .env:');
  console.log('   OZONPAY_ACCESS_KEY=your_access_key_here');
  console.log('   OZONPAY_SECRET_KEY=your_secret_key_here');
  console.log('   OZONPAY_NOTIFICATION_SECRET_KEY=your_notification_secret_key_here');
  console.log('   OZONPAY_API_URL=https://payapi.ozon.ru/v1');
  console.log('2. Перезапустите сервер');
  console.log('3. Протестируйте создание платежа через Ozon Pay');

} catch (error) {
  console.error('❌ Ошибка при обновлении базы данных:', error);
  process.exit(1);
} finally {
  if (db) {
    db.close();
    console.log('🔒 Соединение с базой данных закрыто');
  }
} 