const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'db', 'database.sqlite');

console.log('🔧 СОЗДАНИЕ НЕДОСТАЮЩИХ ПОЛЬЗОВАТЕЛЕЙ');
console.log('📁 База данных:', DB_PATH);

// Известные регистрации с сервера
const knownRegistrations = [
  {
    phone: '+79920793424',
    email: 'admin@primeballoons.ru',
    token: '9enhf3bfk4oamlj8o7wddw'
  },
  {
    phone: '+79615163632',
    email: 'petyatiktoker@gmail.com',
    token: '5ttnebzrgy6izd5ri43zn'
  },
  {
    phone: '+79528582942',
    email: 'kazoku.boido@gmail.com',
    token: 'f8nelh0fn8r57r34iz85xe'
  },
  {
    phone: '+79528398270',
    email: 'helenheinlein@yandex.ru',
    token: 'jj5j28eowr9gt0gspzyyyg'
  },
  {
    phone: '+79528585294',
    email: 'kazoku.boido@gmail.com',
    token: 'dho429kubn5c4h5le9moa'
  }
];

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Ошибка подключения:', err.message);
    return;
  }
  
  console.log('✅ Подключение к базе данных успешно\n');
  
  // Проверяем существующих пользователей
  db.all('SELECT email, phone FROM users', (err, existingUsers) => {
    if (err) {
      console.error('❌ Ошибка получения пользователей:', err);
      db.close();
      return;
    }
    
    console.log('📋 ПРОВЕРКА СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ:');
    
    const toCreate = [];
    
    knownRegistrations.forEach((reg, index) => {
      const exists = existingUsers.find(u => 
        u.email === reg.email || u.phone === reg.phone
      );
      
      console.log(`${index + 1}. ${reg.email} (${reg.phone})`);
      if (exists) {
        console.log(`   ✅ Уже существует`);
      } else {
        console.log(`   ❌ Нужно создать`);
        toCreate.push(reg);
      }
    });
    
    if (toCreate.length === 0) {
      console.log('\n✅ Все пользователи уже существуют');
      db.close();
      return;
    }
    
    console.log(`\n🔧 Создание ${toCreate.length} пользователей:`);
    
    let created = 0;
    let errors = 0;
    
    const createUser = (index) => {
      if (index >= toCreate.length) {
        console.log(`\n📊 РЕЗУЛЬТАТ:`);
        console.log(`✅ Создано: ${created}`);
        console.log(`❌ Ошибок: ${errors}`);
        
        if (created > 0) {
          console.log('\n🔗 АКТИВНЫЕ ССЫЛКИ ДЛЯ ТЕСТИРОВАНИЯ:');
          toCreate.forEach((reg, i) => {
            if (i < created) {
              console.log(`${i + 1}. ${reg.email}:`);
              console.log(`   https://t.me/jungle_plants_bot?start=${reg.token}`);
            }
          });
        }
        
        db.close();
        return;
      }
      
      const reg = toCreate[index];
      const userId = crypto.randomUUID();
      const hashedPassword = '$2b$10$defaulthashedpassword';
      
      console.log(`\n${index + 1}. Создание: ${reg.email}`);
      console.log(`   📞 Телефон: ${reg.phone}`);
      console.log(`   🆔 ID: ${userId}`);
      
      const sql = `
        INSERT INTO users (
          id, email, password, phone, phone_verified, 
          phone_verification_token, telegram_chat_id, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, NULL, datetime('now'), datetime('now'))
      `;
      
      db.run(sql, [userId, reg.email, hashedPassword, reg.phone, reg.token], function(insertErr) {
        if (insertErr) {
          console.error(`   ❌ Ошибка: ${insertErr.message}`);
          errors++;
        } else {
          console.log(`   ✅ Создан успешно`);
          console.log(`   🔗 Ссылка: https://t.me/jungle_plants_bot?start=${reg.token}`);
          created++;
        }
        
        createUser(index + 1);
      });
    };
    
    createUser(0);
  });
}); 