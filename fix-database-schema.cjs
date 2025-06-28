const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔧 Исправление схемы базы данных...');
console.log('📁 Путь к базе данных:', DB_PATH);

function fixDatabaseSchema() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      return;
    }
    console.log('✅ Подключение к базе данных успешно');
  });

  // Добавляем недостающие колонки
  const alterQueries = [
    'ALTER TABLE users ADD COLUMN phone_verification_token TEXT;',
    'ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;'
  ];

  let completed = 0;
  const total = alterQueries.length;

  alterQueries.forEach((query, index) => {
    db.run(query, (err) => {
      completed++;
      
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log(`✅ Колонка уже существует (${index + 1}/${total})`);
        } else {
          console.error(`❌ Ошибка добавления колонки (${index + 1}/${total}):`, err.message);
        }
      } else {
        console.log(`✅ Колонка добавлена успешно (${index + 1}/${total})`);
      }

      // Закрываем соединение после выполнения всех запросов
      if (completed === total) {
        db.close((err) => {
          if (err) {
            console.error('❌ Ошибка закрытия базы данных:', err.message);
          } else {
            console.log('✅ База данных обновлена успешно!');
            console.log('🎉 Теперь можно перезапустить Telegram бота');
          }
        });
      }
    });
  });
}

// Проверяем структуру таблицы users
function checkTableStructure() {
  const db = new sqlite3.Database(DB_PATH);
  
  db.all("PRAGMA table_info(users);", (err, rows) => {
    if (err) {
      console.error('❌ Ошибка проверки структуры таблицы:', err.message);
      return;
    }
    
    console.log('📋 Текущая структура таблицы users:');
    rows.forEach(row => {
      console.log(`  - ${row.name} (${row.type})`);
    });
    
    // Проверяем, есть ли нужные колонки
    const columnNames = rows.map(row => row.name);
    const requiredColumns = ['phone_verification_token', 'phone_verified', 'telegram_chat_id'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Отсутствующие колонки:', missingColumns);
      console.log('🔧 Добавляем недостающие колонки...');
      fixDatabaseSchema();
    } else {
      console.log('✅ Все необходимые колонки присутствуют');
    }
    
    db.close();
  });
}

// Запускаем проверку
checkTableStructure(); 