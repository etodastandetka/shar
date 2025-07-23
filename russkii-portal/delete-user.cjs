const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🗑️ Скрипт удаления пользователя из базы данных');
console.log('📁 Путь к базе данных:', DB_PATH);

// Создаем интерфейс для ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getDatabase() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
      process.exit(1);
    }
  });
}

// Функция для поиска пользователей
function searchUsers(searchTerm) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT id, email, phone, telegram_chat_id, phone_verified, created_at 
      FROM users 
      WHERE email LIKE ? OR phone LIKE ? OR telegram_chat_id LIKE ?
      ORDER BY created_at DESC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    
    db.all(query, [searchPattern, searchPattern, searchPattern], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
      db.close();
    });
  });
}

// Функция для удаления пользователя
function deleteUser(userId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
      db.close();
    });
  });
}

// Функция для показа всех пользователей
function showAllUsers() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.all('SELECT id, email, phone, telegram_chat_id, phone_verified, created_at FROM users ORDER BY created_at DESC LIMIT 10', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
      db.close();
    });
  });
}

// Основная функция
async function main() {
  try {
    console.log('\n📋 Выберите действие:');
    console.log('1. Показать последних 10 пользователей');
    console.log('2. Найти пользователя по email/телефону');
    console.log('3. Удалить всех пользователей (ОСТОРОЖНО!)');
    console.log('4. Выход');
    
    rl.question('\nВведите номер действия (1-4): ', async (choice) => {
      try {
        switch (choice) {
          case '1':
            console.log('\n📋 Последние 10 пользователей:');
            const allUsers = await showAllUsers();
            if (allUsers.length === 0) {
              console.log('❌ Пользователи не найдены');
            } else {
              allUsers.forEach((user, index) => {
                console.log(`\n${index + 1}. ID: ${user.id}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Телефон: ${user.phone || 'не указан'}`);
                console.log(`   Telegram: ${user.telegram_chat_id || 'не связан'}`);
                console.log(`   Верифицирован: ${user.phone_verified ? 'Да' : 'Нет'}`);
                console.log(`   Создан: ${user.created_at}`);
              });
              
              rl.question('\nВведите ID пользователя для удаления (или Enter для отмены): ', async (userId) => {
                if (userId.trim()) {
                  const deleted = await deleteUser(userId.trim());
                  if (deleted > 0) {
                    console.log(`✅ Пользователь с ID ${userId} удален успешно!`);
                  } else {
                    console.log(`❌ Пользователь с ID ${userId} не найден`);
                  }
                } else {
                  console.log('❌ Удаление отменено');
                }
                rl.close();
              });
            }
            break;
            
          case '2':
            rl.question('Введите email или телефон для поиска: ', async (searchTerm) => {
              if (!searchTerm.trim()) {
                console.log('❌ Поисковый запрос не может быть пустым');
                rl.close();
                return;
              }
              
              const users = await searchUsers(searchTerm);
              if (users.length === 0) {
                console.log('❌ Пользователи не найдены');
              } else {
                console.log(`\n📋 Найдено пользователей: ${users.length}`);
                users.forEach((user, index) => {
                  console.log(`\n${index + 1}. ID: ${user.id}`);
                  console.log(`   Email: ${user.email}`);
                  console.log(`   Телефон: ${user.phone || 'не указан'}`);
                  console.log(`   Telegram: ${user.telegram_chat_id || 'не связан'}`);
                  console.log(`   Верифицирован: ${user.phone_verified ? 'Да' : 'Нет'}`);
                });
                
                rl.question('\nВведите ID пользователя для удаления (или Enter для отмены): ', async (userId) => {
                  if (userId.trim()) {
                    const deleted = await deleteUser(userId.trim());
                    if (deleted > 0) {
                      console.log(`✅ Пользователь с ID ${userId} удален успешно!`);
                    } else {
                      console.log(`❌ Пользователь с ID ${userId} не найден`);
                    }
                  } else {
                    console.log('❌ Удаление отменено');
                  }
                  rl.close();
                });
              }
            });
            break;
            
          case '3':
            rl.question('⚠️ ВНИМАНИЕ! Это удалит ВСЕХ пользователей! Введите "DELETE ALL" для подтверждения: ', async (confirmation) => {
              if (confirmation === 'DELETE ALL') {
                const db = getDatabase();
                db.run('DELETE FROM users', function(err) {
                  if (err) {
                    console.error('❌ Ошибка удаления:', err.message);
                  } else {
                    console.log(`✅ Удалено ${this.changes} пользователей`);
                  }
                  db.close();
                  rl.close();
                });
              } else {
                console.log('❌ Удаление отменено');
                rl.close();
              }
            });
            break;
            
          case '4':
            console.log('👋 До свидания!');
            rl.close();
            break;
            
          default:
            console.log('❌ Неверный выбор');
            rl.close();
        }
      } catch (error) {
        console.error('❌ Ошибка:', error.message);
        rl.close();
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    rl.close();
  }
}

// Запускаем скрипт
main(); 