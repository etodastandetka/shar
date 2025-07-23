console.log('🚀🚀🚀 ЗАПУСК НОВОГО ИСПРАВЛЕННОГО БОТА 2025-01-28 🚀🚀🚀');
process.stdout.write('НОВЫЙ БОТ ВЕРСИЯ 2.0 ЗАПУЩЕН\n');

const { Telegraf } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Загружаем переменные окружения
require('dotenv').config();

// ТОКЕН БОТА из переменных окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ ОШИБКА: Токен бота не найден!');
  console.error('💡 Создайте файл .env в корне проекта и добавьте:');
  console.error('   TELEGRAM_BOT_TOKEN=ваш_токен_от_botfather');
  console.error('💡 Или установите переменную окружения BOT_TOKEN');
  process.exit(1);
}

// Создаем экземпляр бота
const bot = new Telegraf(BOT_TOKEN);

// Путь к базе данных
const DB_PATH = path.join(__dirname, '..', 'db', 'database.sqlite');

console.log('🤖 Запуск Telegram бота...');
console.log('📁 Путь к базе данных:', DB_PATH);
console.log('🔥 ИСПРАВЛЕННАЯ ВЕРСИЯ БОТА ЗАПУЩЕНА! (новая логика pending_registrations)');

// Функция для работы с базой данных
function getDatabase() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Ошибка подключения к базе данных:', err.message);
    }
  });
}

// Функция для создания таблицы telegram_chat_id если её нет
function ensureTelegramChatIdColumn() {
  const db = getDatabase();
  
  db.run(`
    ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ Ошибка добавления колонки telegram_chat_id:', err.message);
    } else if (!err) {
      console.log('✅ Колонка telegram_chat_id добавлена в таблицу users');
    }
  });
  
  db.close();
}

// Функция для получения пользователя по токену
function getUserByToken(token) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.get(
      'SELECT * FROM users WHERE phone_verification_token = ?',
      [token],
      (err, row) => {
        if (err) {
          console.error('❌ Ошибка поиска пользователя по токену:', err);
          reject(err);
        } else {
          resolve(row);
        }
        db.close();
      }
    );
  });
}

// Функция для обновления telegram_chat_id пользователя
function updateUserTelegramChatId(userId, chatId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.run(
      'UPDATE users SET telegram_chat_id = ? WHERE id = ?',
      [chatId ? chatId.toString() : null, userId],
      function(err) {
        if (err) {
          console.error('❌ Ошибка обновления telegram_chat_id:', err);
          reject(err);
        } else {
          if (chatId) {
            console.log(`✅ Обновлен telegram_chat_id для пользователя ${userId}: ${chatId}`);
          } else {
            console.log(`✅ Telegram отвязан от пользователя ${userId}`);
          }
          resolve(this.changes);
        }
        db.close();
      }
    );
  });
}

// Функция для подтверждения номера телефона - ИСПРАВЛЕННАЯ
function confirmPhoneVerification(userId, phoneNumber) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    // Нормализуем номер телефона
    let normalizedPhone = phoneNumber.replace(/[^\d+]/g, '');
    if (normalizedPhone.startsWith('8')) {
      normalizedPhone = '+7' + normalizedPhone.slice(1);
    }
    if (normalizedPhone.startsWith('7') && !normalizedPhone.startsWith('+7')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 11 && normalizedPhone.startsWith('7')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 10) {
      normalizedPhone = '+7' + normalizedPhone;
    }
    
    console.log(`📞 ИСПРАВЛЕННАЯ ЛОГИКА: Обновляем pending_registrations для номера: ${normalizedPhone}`);
    
    // ТОЛЬКО обновляем pending_registrations (НЕ создаем пользователя!)
    db.run(
      'UPDATE pending_registrations SET verified = 1 WHERE phone = ?',
      [normalizedPhone],
      function(err) {
        if (err) {
          console.error('❌ Ошибка обновления pending_registrations:', err);
          reject(err);
        } else {
          console.log(`✅ Обновлено записей в pending_registrations: ${this.changes}`);
          console.log('🎯 Пользователь будет создан на сайте после нажатия "Я подтвердил номер"');
          resolve(this.changes);
        }
        db.close();
      }
    );
  });
}

// Функция для получения заказов пользователя
function getUserOrders(userId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.all(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      (err, rows) => {
        if (err) {
          console.error('❌ Ошибка получения заказов:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
        db.close();
      }
    );
  });
}

// Функция для получения пользователя по telegram_chat_id
function getUserByChatId(chatId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.get(
      'SELECT * FROM users WHERE telegram_chat_id = ?',
      [chatId.toString()],
      (err, row) => {
        if (err) {
          console.error('❌ Ошибка поиска пользователя по chat_id:', err);
          reject(err);
        } else {
          resolve(row);
        }
        db.close();
      }
    );
  });
}

// Функция для получения всех пользователей с telegram_chat_id
function getAllUsersWithTelegram() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.all(
      'SELECT * FROM users WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id != ""',
      [],
      (err, rows) => {
        if (err) {
          console.error('❌ Ошибка получения пользователей с Telegram:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
        db.close();
      }
    );
  });
}

// Функция для получения пользователя по токену (включая уже верифицированных)
function getUserByTokenOrVerified(token) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    // Сначала ищем по токену
    db.get(
      'SELECT * FROM users WHERE phone_verification_token = ?',
      [token],
      (err, row) => {
        if (err) {
          console.error('❌ Ошибка поиска пользователя по токену:', err);
          reject(err);
          db.close();
          return;
        }
        
        if (row) {
          // Пользователь найден по токену
          resolve(row);
          db.close();
          return;
        }
        
        // Если не найден по токену, возможно уже верифицирован
        // Ищем пользователей, которые недавно регистрировались
        db.get(
          'SELECT * FROM users WHERE phone_verified = 1 AND created_at > datetime("now", "-1 hour") ORDER BY created_at DESC LIMIT 1',
          [],
          (err2, row2) => {
            if (err2) {
              console.error('❌ Ошибка поиска верифицированного пользователя:', err2);
              reject(err2);
            } else {
              resolve(row2);
            }
            db.close();
          }
        );
      }
    );
  });
}

// НОВАЯ ФУНКЦИЯ ДЛЯ ПОИСКА ПОЛЬЗОВАТЕЛЯ - ВЕРСИЯ 3.0
async function findUserForVerification(token, chatId) {
  console.log(`🆕 НОВАЯ ЛОГИКА 3.0: Поиск пользователя для верификации:`);
  console.log(`   🔑 Токен: ${token}`);
  console.log(`   💬 Chat ID: ${chatId}`);
  
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    // Сначала ищем в pending_registrations по токену
    db.get(
      'SELECT * FROM pending_registrations WHERE verification_token = ?',
      [token],
      (err, pendingReg) => {
        if (err) {
          console.error('❌ Ошибка поиска в pending_registrations:', err);
          // Продолжаем поиск в users
                        } else if (pendingReg) {
          console.log(`🎯 ВЕРСИЯ 3.0: Найдена запись в pending_registrations:`);
          console.log(`   📞 Телефон: ${pendingReg.phone}`);
          console.log(`   ✅ Верифицирован: ${pendingReg.verified ? 'Да' : 'Нет'}`);
          console.log(`   📅 Создан: ${pendingReg.created_at}`);
          
          try {
            const userData = JSON.parse(pendingReg.user_data);
            console.log(`   📧 ВЕРСИЯ 3.0 - Email: ${userData.email}`);
            
            // Если регистрация еще не верифицирована, верифицируем её
            if (!pendingReg.verified) {
              console.log(`🚀 ВЕРСИЯ 3.0: Верифицируем pending_registrations...`);
              
              db.run(
                'UPDATE pending_registrations SET verified = 1 WHERE id = ?',
                [pendingReg.id],
                function(updateErr) {
                  if (updateErr) {
                    console.error('❌ Ошибка верификации pending_registrations:', updateErr);
                    db.close();
                    reject(updateErr);
                    return;
                  }
                  
                  console.log(`🎉 ВЕРСИЯ 3.0: Pending registration верифицирована успешно`);
                  
                  // Возвращаем специальный объект, который покажет пользователю, что нужно вернуться на сайт
                  const result = {
                    isPendingVerification: true,
                    email: userData.email,
                    phone: pendingReg.phone,
                    message: 'Номер подтвержден! Вернитесь на сайт и нажмите "Я подтвердил номер"'
                  };
                  
                  db.close();
                  resolve(result);
                }
              );
              return;
            } else {
              // Регистрация уже верифицирована, проверяем, создан ли пользователь
              console.log(`✅ Регистрация уже верифицирована, проверяем пользователя...`);
              
              // Ищем пользователя в таблице users
              db.get(
                'SELECT * FROM users WHERE email = ? OR phone = ?',
                [userData.email, pendingReg.phone],
                (userErr, user) => {
                  if (userErr) {
                    console.error('❌ Ошибка поиска пользователя:', userErr);
                    db.close();
                    reject(userErr);
                    return;
                  }
                  
                  if (user) {
                    console.log(`✅ Найден пользователь: ${user.email}`);
                    db.close();
                    resolve(user);
                  } else {
                    console.log(`⏳ Пользователь еще не создан, ждем завершения регистрации...`);
                    
                    // Возвращаем специальный объект
                    const result = {
                      isPendingVerification: true,
                      email: userData.email,
                      phone: pendingReg.phone,
                      message: 'Номер уже подтвержден! Вернитесь на сайт и нажмите "Я подтвердил номер"'
                    };
                    
                    db.close();
                    resolve(result);
                  }
                }
              );
            }
          } catch (parseErr) {
            console.error('❌ Ошибка парсинга данных пользователя:', parseErr);
            db.close();
            resolve(null);
          }
          return;
        }
        
        // Если не найдено в pending_registrations, ищем в users по токену
        db.get(
          'SELECT * FROM users WHERE phone_verification_token = ?',
          [token],
          (err2, userByToken) => {
            if (err2) {
              console.error('❌ Ошибка поиска по токену в users:', err2);
              db.close();
              reject(err2);
              return;
            }
            
            console.log(`📋 Поиск по токену в users: ${userByToken ? 'найден' : 'не найден'}`);
            if (userByToken) {
              console.log(`   Найден: ${userByToken.email} (ID: ${userByToken.id})`);
              console.log(`   Верифицирован: ${userByToken.phone_verified ? 'Да' : 'Нет'}`);
              console.log(`   Telegram ID: ${userByToken.telegram_chat_id || 'не установлен'}`);
              db.close();
              resolve(userByToken);
              return;
            }
            
            // Если не найден по токену, ищем по chat_id
            db.get(
              'SELECT * FROM users WHERE telegram_chat_id = ?',
              [chatId.toString()],
              (err3, userByChatId) => {
                if (err3) {
                  console.error('❌ Ошибка поиска по chat_id:', err3);
                  db.close();
                  reject(err3);
                  return;
                }
                
                console.log(`📋 Поиск по chat_id: ${userByChatId ? 'найден' : 'не найден'}`);
                if (userByChatId) {
                  console.log(`   Найден: ${userByChatId.email} (ID: ${userByChatId.id})`);
                  console.log(`   Верифицирован: ${userByChatId.phone_verified ? 'Да' : 'Нет'}`);
                  db.close();
                  resolve(userByChatId);
                  return;
                }
                
                console.log('❌ Пользователь не найден ни по одному критерию');
                db.close();
                resolve(null);
              }
            );
          }
        );
      }
    );
  });
}

// КОМАНДА /start
bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  const startPayload = ctx.startPayload; // Токен из ссылки
  
  console.log(`📱 Получена команда /start от пользователя ${chatId}, токен: ${startPayload}`);
  
  if (startPayload) {
    // Это верификация номера телефона
    try {
      const user = await findUserForVerification(startPayload, chatId);
      
      if (user) {
        // Проверяем, это ли ожидающая верификация
        if (user.isPendingVerification) {
          console.log(`⏳ Обработка ожидающей верификации для: ${user.email}`);
          
          await ctx.reply(
            `✅ ${user.message}\n\n` +
            `📧 Email: ${user.email}\n` +
            `📱 Телефон: ${user.phone}\n\n` +
            `🔄 Что делать дальше:\n` +
            `1️⃣ Вернитесь на сайт\n` +
            `2️⃣ Нажмите кнопку "Я подтвердил номер"\n` +
            `3️⃣ Завершите регистрацию\n\n` +
            `🌐 Сайт: https://helens-jungle.ru`,
            {
              reply_markup: {
                inline_keyboard: [[
                  { text: '🌐 Перейти на сайт', url: 'https://helens-jungle.ru' }
                ]]
              }
            }
          );
          return;
        }
        
        console.log(`✅ Пользователь найден: ${user.email} (ID: ${user.id})`);
        
        // Проверяем, уже ли верифицирован
        if (user.phone_verified) {
          // Пользователь уже верифицирован
          await updateUserTelegramChatId(user.id, chatId);
          await ctx.reply(
            `Привет, ${user.email}!\n\n` +
            `✅ Ваш номер телефона уже подтвержден.\n` +
            `🔗 Теперь вы подключены к боту!\n\n` +
            `🌱 Добро пожаловать в Jungle Plants!`,
            {
              reply_markup: {
                keyboard: [
                  ['Мои заказы', 'Новые товары'],
                  ['Перейти на сайт', 'Помощь']
                ],
                resize_keyboard: true
              }
            }
          );
        } else {
          // Пользователь не верифицирован, просим отправить номер
          await updateUserTelegramChatId(user.id, chatId);
          
          // Получаем ожидаемый номер телефона из pending_registrations
          const db = getDatabase();
          const pendingReg = await new Promise((resolve, reject) => {
            db.get(
              'SELECT * FROM pending_registrations WHERE user_data LIKE ? AND verified = 0 ORDER BY created_at DESC LIMIT 1',
              [`%${user.email}%`],
              (err, row) => {
                if (err) {
                  console.error('❌ Ошибка поиска pending_registration:', err);
                  reject(err);
                } else {
                  resolve(row);
                }
                db.close();
              }
            );
          });
          
          let expectedPhoneMessage = '';
          if (pendingReg && pendingReg.phone) {
            expectedPhoneMessage = `\n\n🔍 Ожидаемый номер: ${pendingReg.phone}`;
          }
          
          await ctx.reply(
            `Привет, ${user.email}!\n\n` +
            `📱 Для подтверждения номера телефона отправьте свой контакт, нажав кнопку ниже.` +
            expectedPhoneMessage +
            `\n\n⚠️ Важно: номер должен совпадать с указанным при регистрации!`,
            {
              reply_markup: {
                keyboard: [
                  [{ text: '📞 Отправить номер телефона', request_contact: true }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
              }
            }
          );
        }
      } else {
        console.log(`❌ Пользователь не найден для токена: ${startPayload}`);
        await ctx.reply(
          '🔍 Не удалось найти вашу учетную запись.\n\n' +
          '🔄 Попробуйте:\n' +
          '1️⃣ Зарегистрироваться заново на сайте\n' +
          '2️⃣ Проверить правильность ссылки\n' +
          '3️⃣ Обратиться в поддержку\n\n' +
          '🌐 Сайт: https://helens-jungle.ru\n' +
          '📞 Канал: @helensjungle'
        );
      }
    } catch (error) {
      console.error('❌ Ошибка при верификации:', error);
      await ctx.reply(
        '⚠️ Произошла ошибка при поиске учетной записи.\n\n' +
        '🔄 Попробуйте:\n' +
        '• Зарегистрироваться заново\n' +
        '• Обратиться в поддержку\n\n' +
        '🌐 https://helens-jungle.ru'
      );
    }
  } else {
    // Обычный запуск бота
    await ctx.reply(
      '🌱 Добро пожаловать в Jungle Plants!\n\n' +
      '📋 Здесь вы можете:\n' +
      '🛒 Проверить статус своих заказов\n' +
      '🆕 Получать уведомления о новых товарах\n' +
      '🌐 Быстро перейти на наш сайт\n\n' +
      '👇 Выберите действие:',
      {
        reply_markup: {
          keyboard: [
            ['🛒 Мои заказы', '🆕 Новые товары'],
            ['🌐 Перейти на сайт', '❓ Помощь']
          ],
          resize_keyboard: true
        }
      }
    );
  }
});

// ОБРАБОТКА КОНТАКТА (номера телефона)
bot.on('contact', async (ctx) => {
  const chatId = ctx.chat.id;
  const contact = ctx.message.contact;
  const phoneNumber = contact.phone_number;
  
  console.log(`📱 Получен контакт от пользователя ${chatId}: ${phoneNumber}`);
  
  try {
    // Находим пользователя по chat_id
    const user = await getUserByChatId(chatId);
    
    if (!user) {
      await ctx.reply('❌ Пользователь не найден. Попробуйте зарегистрироваться заново.');
      return;
    }
    
    // Нормализуем полученный номер телефона
    let normalizedReceivedPhone = phoneNumber.replace(/[^\d+]/g, '');
    if (normalizedReceivedPhone.startsWith('8')) {
      normalizedReceivedPhone = '+7' + normalizedReceivedPhone.slice(1);
    }
    if (normalizedReceivedPhone.startsWith('7') && !normalizedReceivedPhone.startsWith('+7')) {
      normalizedReceivedPhone = '+' + normalizedReceivedPhone;
    }
    if (!normalizedReceivedPhone.startsWith('+') && normalizedReceivedPhone.length === 11 && normalizedReceivedPhone.startsWith('7')) {
      normalizedReceivedPhone = '+' + normalizedReceivedPhone;
    }
    if (!normalizedReceivedPhone.startsWith('+') && normalizedReceivedPhone.length === 10) {
      normalizedReceivedPhone = '+7' + normalizedReceivedPhone;
    }
    
    console.log(`📞 Нормализованный полученный номер: ${normalizedReceivedPhone}`);
    
    // Ищем pending_registration для этого пользователя
    const db = getDatabase();
    const pendingReg = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pending_registrations WHERE user_data LIKE ? AND verified = 0 ORDER BY created_at DESC LIMIT 1',
        [`%${user.email}%`],
        (err, row) => {
          if (err) {
            console.error('❌ Ошибка поиска pending_registration:', err);
            reject(err);
          } else {
            resolve(row);
          }
          db.close();
        }
      );
    });
    
    if (!pendingReg) {
      await ctx.reply(
        '❌ Регистрация не найдена.\n\n' +
        '🔄 Попробуйте зарегистрироваться заново на сайте:\n' +
        '🌐 https://helens-jungle.ru'
      );
      return;
    }
    
    // Нормализуем номер из pending_registrations
    let expectedPhone = pendingReg.phone.replace(/[^\d+]/g, '');
    if (expectedPhone.startsWith('8')) {
      expectedPhone = '+7' + expectedPhone.slice(1);
    }
    if (expectedPhone.startsWith('7') && !expectedPhone.startsWith('+7')) {
      expectedPhone = '+' + expectedPhone;
    }
    if (!expectedPhone.startsWith('+') && expectedPhone.length === 11 && expectedPhone.startsWith('7')) {
      expectedPhone = '+' + expectedPhone;
    }
    if (!expectedPhone.startsWith('+') && expectedPhone.length === 10) {
      expectedPhone = '+7' + expectedPhone;
    }
    
    console.log(`📋 Ожидаемый номер из pending_registrations: ${expectedPhone}`);
    console.log(`📱 Полученный номер: ${normalizedReceivedPhone}`);
    
    // Проверяем, совпадают ли номера
    if (normalizedReceivedPhone !== expectedPhone) {
      await ctx.reply(
        `❌ Номер телефона не совпадает!\n\n` +
        `🔍 Ожидался: ${expectedPhone}\n` +
        `📱 Получен: ${normalizedReceivedPhone}\n\n` +
        `💡 Пожалуйста, отправьте контакт с номером ${expectedPhone} или зарегистрируйтесь заново.`
      );
      return;
    }
    
    // Номера совпадают - подтверждаем верификацию
    await confirmPhoneVerification(user.id, normalizedReceivedPhone);
    
    await ctx.reply(
      '✅ Номер телефона подтвержден!\n\n' +
      '🔄 Теперь завершите регистрацию на сайте:\n' +
      '🌐 https://helens-jungle.ru\n\n' +
      `📧 Email: ${user.email}\n` +
      `📱 Телефон: ${normalizedReceivedPhone}\n\n` +
      'После завершения регистрации вы сможете пользоваться ботом полноценно!',
      {
        reply_markup: {
          keyboard: [
            ['Мои заказы', 'Новые товары'],
            ['Перейти на сайт', 'Помощь']
          ],
          resize_keyboard: true
        }
      }
    );
    
  } catch (error) {
    console.error('❌ Ошибка при подтверждении номера:', error);
    await ctx.reply('❌ Произошла ошибка при подтверждении номера. Попробуйте позже.');
  }
});

// КОМАНДА /orders и кнопка "Мои заказы"
async function handleOrdersCommand(ctx) {
  const chatId = ctx.chat.id;
  
  try {
    const user = await getUserByChatId(chatId);
    
    if (!user) {
      await ctx.reply('Пользователь не найден. Пожалуйста, зарегистрируйтесь на сайте.');
      return;
    }
    
    const orders = await getUserOrders(user.id);
    
    if (orders.length === 0) {
      await ctx.reply('У вас пока нет заказов.\n\nПерейти в каталог: https://helens-jungle.ru/catalog');
    } else {
      let ordersList = 'Ваши заказы:\n\n';
      
      orders.forEach((order, index) => {
        const date = new Date(order.created_at).toLocaleString('ru-RU');
        const status = order.status || 'новый';
        const total = order.total_amount || 0;
        
        ordersList += `${index + 1}. Заказ #${order.id}\n`;
        ordersList += `Дата: ${date}\n`;
        ordersList += `Сумма: ${total} руб.\n`;
        ordersList += `Статус: ${status}\n\n`;
      });
      
      await ctx.reply(ordersList);
    }
  } catch (error) {
    console.error('❌ Ошибка при получении заказов:', error);
    await ctx.reply('Произошла ошибка при получении заказов. Попробуйте позже.');
  }
}

bot.command('orders', handleOrdersCommand);
bot.hears('Мои заказы', handleOrdersCommand);
bot.hears('🛒 Мои заказы', handleOrdersCommand);

// КОМАНДА /unlink - отвязка от бота
async function handleUnlinkCommand(ctx) {
  const chatId = ctx.chat.id;
  
  try {
    const user = await getUserByChatId(chatId);
    
    if (!user) {
      await ctx.reply('❌ Пользователь не найден в системе.');
      return;
    }
    
    // Подтверждение отвязки
    await ctx.reply(
      '⚠️ Вы уверены, что хотите отвязать этот Telegram от своего аккаунта?\n\n' +
      '❗ После отвязки вы не будете получать уведомления о заказах.\n\n' +
      'Отправьте "ДА" для подтверждения или любое другое сообщение для отмены.',
      { reply_markup: { remove_keyboard: true } }
    );
    
    // Ждем подтверждения
    bot.hears(/^(да|ДА|yes|YES)$/i, async (confirmCtx) => {
      if (confirmCtx.chat.id !== chatId) return; // Проверяем, что это тот же пользователь
      
      try {
        // Отвязываем telegram_chat_id
        await updateUserTelegramChatId(user.id, null);
        
        await confirmCtx.reply(
          '✅ Telegram успешно отвязан от вашего аккаунта!\n\n' +
          '🔄 Вы можете заново привязать бота, перейдя в профиль на сайте.\n\n' +
          '🌐 Сайт: https://russkii-portal.ru/profile'
        );
      } catch (error) {
        console.error('❌ Ошибка отвязки:', error);
        await confirmCtx.reply('❌ Произошла ошибка при отвязке. Попробуйте позже.');
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка команды unlink:', error);
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
}

bot.command('unlink', handleUnlinkCommand);

// КОМАНДА /help и кнопка "Помощь"
async function handleHelpCommand(ctx) {
  await ctx.reply(
    'Помощь по боту Jungle Plants\n\n' +
    'Доступные команды:\n' +
    '/start - Главное меню\n' +
    '/orders - Мои заказы\n' +
    '/unlink - Отвязать Telegram от аккаунта\n' +
    '/help - Эта справка\n' +
    '/site - Ссылки на сайт\n\n' +
    'Кнопки меню:\n' +
    'Мои заказы - Просмотр ваших заказов\n' +
    'Новые товары - Информация о новинках\n' +
    'Перейти на сайт - Ссылка на сайт\n\n' +
    'Поддержка: @helensjungle'
  );
}

bot.command('help', handleHelpCommand);
bot.hears('Помощь', handleHelpCommand);
bot.hears('❓ Помощь', handleHelpCommand);

// КОМАНДА /site и кнопка "Перейти на сайт"
async function handleSiteCommand(ctx) {
  await ctx.reply(
    'Ссылки на наш сайт:\n\n' +
    'Главная: https://helens-jungle.ru\n' +
    'Каталог: https://helens-jungle.ru/catalog\n' +
    'Корзина: https://helens-jungle.ru/cart\n' +
    'Профиль: https://helens-jungle.ru/profile\n\n' +
    'Telegram канал: @helensjungle'
  );
}

bot.command('site', handleSiteCommand);
bot.hears('Перейти на сайт', handleSiteCommand);
bot.hears('🌐 Перейти на сайт', handleSiteCommand);

// Кнопка "Новые товары"
async function handleNewProductsCommand(ctx) {
  await ctx.reply(
    '🆕 Новые товары\n\n' +
    '🌱 Мы регулярно добавляем новые растения в наш каталог!\n' +
    '🔔 Вы будете получать уведомления о всех новинках.\n\n' +
    '🛒 Посмотреть каталог: https://helens-jungle.ru/catalog\n' +
    '📢 Следите за новостями: @helensjungle'
  );
}

bot.hears('Новые товары', handleNewProductsCommand);
bot.hears('🆕 Новые товары', handleNewProductsCommand);

// ФУНКЦИИ ДЛЯ ОТПРАВКИ УВЕДОМЛЕНИЙ (экспорт для использования в других файлах)

// Отправка уведомления о заказе пользователю
async function sendOrderNotificationToUser(userId, orderData) {
  try {
    // Сначала ищем пользователя по ID
    const db = getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ? AND telegram_chat_id IS NOT NULL AND telegram_chat_id != ""',
        [userId],
        (err, row) => {
          if (err) {
            console.error('❌ Ошибка поиска пользователя по ID:', err);
            reject(err);
          } else {
            resolve(row);
          }
          db.close();
        }
      );
    });
    
    if (!user || !user.telegram_chat_id) {
      console.log(`⚠️ Пользователь ${userId} не найден или не имеет Telegram`);
      return false;
    }

    const message = `Новый заказ!\n\n` +
      `Заказ #${orderData.orderId}\n` +
      `Сумма: ${orderData.totalAmount} руб.\n` +
      `Дата: ${new Date().toLocaleString('ru-RU')}\n\n` +
      `Проверить статус: /orders\n` +
      `Сайт: https://helens-jungle.ru/profile`;

    await bot.telegram.sendMessage(user.telegram_chat_id, message);
    console.log(`✅ Уведомление о заказе отправлено пользователю ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка отправки уведомления о заказе пользователю ${userId}:`, error);
    return false;
  }
}

// Отправка уведомления об изменении статуса заказа
async function sendOrderStatusUpdateToUser(userId, orderData) {
  try {
    // Сначала ищем пользователя по ID
    const db = getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ? AND telegram_chat_id IS NOT NULL AND telegram_chat_id != ""',
        [userId],
        (err, row) => {
          if (err) {
            console.error('❌ Ошибка поиска пользователя по ID:', err);
            reject(err);
          } else {
            resolve(row);
          }
          db.close();
        }
      );
    });
    
    if (!user || !user.telegram_chat_id) {
      console.log(`⚠️ Пользователь ${userId} не найден или не имеет Telegram`);
      return false;
    }

    const message = `Обновление статуса заказа\n\n` +
      `Заказ #${orderData.orderId}\n` +
      `Новый статус: ${orderData.status}\n` +
      `Обновлено: ${new Date().toLocaleString('ru-RU')}\n\n` +
      `Все заказы: /orders\n` +
      `Сайт: https://helens-jungle.ru/profile`;

    await bot.telegram.sendMessage(user.telegram_chat_id, message);
    console.log(`✅ Уведомление об изменении статуса отправлено пользователю ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка отправки уведомления об изменении статуса пользователю ${userId}:`, error);
    return false;
  }
}

// Отправка уведомления о новом товаре всем пользователям
async function sendNewProductNotificationToAllUsers(productData) {
  try {
    const users = await getAllUsersWithTelegram();
    console.log(`📢 Отправка уведомления о новом товаре ${users.length} пользователям`);
    
    let sentCount = 0;
    
    const message = `Новый товар в каталоге!\n\n` +
      `${productData.productName}\n` +
      `Цена: ${productData.productPrice} руб.\n` +
      `Категория: ${productData.productCategory}\n` +
      `${productData.productDescription}\n\n` +
      `Посмотреть: https://helens-jungle.ru/product/${productData.productId}\n` +
      `Каталог: https://helens-jungle.ru/catalog`;

    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegram_chat_id, message);
        sentCount++;
        console.log(`✅ Уведомление отправлено пользователю ${user.id} (${user.email})`);
        
        // Небольшая задержка между сообщениями
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Ошибка отправки пользователю ${user.id}:`, error);
      }
    }
    
    console.log(`📊 Уведомление о новом товаре отправлено ${sentCount}/${users.length} пользователям`);
    return sentCount;
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о новом товаре:', error);
    return 0;
  }
}

// Отправка статуса заказов пользователю
async function sendUserOrdersStatus(chatId) {
  try {
    const user = await getUserByChatId(chatId);
    if (!user) {
      await bot.telegram.sendMessage(chatId, 'Пользователь не найден. Пожалуйста, зарегистрируйтесь на сайте.');
      return false;
    }
    
    const orders = await getUserOrders(user.id);
    
    if (orders.length === 0) {
      await bot.telegram.sendMessage(chatId, 'У вас пока нет заказов.\n\nПерейти в каталог: https://helens-jungle.ru/catalog');
    } else {
      let ordersList = 'Ваши заказы:\n\n';
      
      orders.forEach((order, index) => {
        const date = new Date(order.created_at).toLocaleString('ru-RU');
        const status = order.status || 'новый';
        const total = order.total_amount || 0;
        
        ordersList += `${index + 1}. Заказ #${order.id}\n`;
        ordersList += `Дата: ${date}\n`;
        ordersList += `Сумма: ${total} руб.\n`;
        ordersList += `Статус: ${status}\n\n`;
      });
      
      await bot.telegram.sendMessage(chatId, ordersList);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки статуса заказов:', error);
    return false;
  }
}

// Отправка фискального чека пользователю (требования 54-ФЗ)
async function sendFiscalReceiptToUser(userPhone, receiptData) {
  try {
    console.log(`🧾 Отправка фискального чека для номера: ${userPhone}`);
    
    // Нормализуем номер телефона
    let normalizedPhone = userPhone.replace(/[^\d+]/g, '');
    if (normalizedPhone.startsWith('8')) {
      normalizedPhone = '+7' + normalizedPhone.slice(1);
    }
    if (normalizedPhone.startsWith('7') && !normalizedPhone.startsWith('+7')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 11 && normalizedPhone.startsWith('7')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 10) {
      normalizedPhone = '+7' + normalizedPhone;
    }
    
    // Находим пользователя по телефону
    const db = getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE phone = ? AND telegram_chat_id IS NOT NULL AND telegram_chat_id != ""',
        [normalizedPhone],
        (err, row) => {
          if (err) {
            console.error('❌ Ошибка поиска пользователя по телефону:', err);
            reject(err);
          } else {
            resolve(row);
          }
          db.close();
        }
      );
    });
    
    if (!user || !user.telegram_chat_id) {
      console.log(`⚠️ Пользователь с номером ${normalizedPhone} не найден или не имеет Telegram`);
      return false;
    }

    // Формируем фискальный чек согласно 54-ФЗ для интернет-магазина
    const fiscalReceipt = formatFiscalReceipt(receiptData, user);
    
    await bot.telegram.sendMessage(user.telegram_chat_id, fiscalReceipt, {
      parse_mode: 'HTML'
    });
    
    console.log(`✅ Фискальный чек отправлен пользователю ${user.id} (${user.email})`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка отправки фискального чека:`, error);
    return false;
  }
}

// Форматирование фискального чека согласно 54-ФЗ для интернет-магазина
function formatFiscalReceipt(receiptData, user) {
  const {
    orderId,
    items,
    totalAmount,
    deliveryAmount,
    paymentMethod,
    transactionId,
    companyInfo,
    kassaInfo
  } = receiptData;
  
  // Генерируем номер чека и смены (в реальной системе это данные от ККТ)
  const receiptNumber = `${orderId}-${Date.now().toString().slice(-6)}`;
  const shiftNumber = Math.floor(Date.now() / 86400000) % 1000; // Условный номер смены
  const fiscalDocumentNumber = Date.now().toString().slice(-8); // Порядковый номер ФД
  const currentDate = new Date();
  const fiscalDateTime = currentDate.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Заголовок чека с реквизитами (ст. 4.7 п.1 54-ФЗ)
  let receipt = `🧾 <b>КАССОВЫЙ ЧЕК</b>\n`; // Обязательный реквизит: наименование документа
  receipt += `📄 <b>ПРИХОД</b>\n`; // Обязательный реквизит: признак расчета
  receipt += `🌐 <b>ИНТЕРНЕТ-МАГАЗИН</b>\n\n`;
  
  // Реквизиты получателя платежа (обязательные по 54-ФЗ)
  receipt += `🏢 <b>${companyInfo?.name || 'Helen\'s Jungle'}</b>\n`; // Наименование организации
  receipt += `🆔 ИНН: ${companyInfo?.inn || 'НЕ УКАЗАН'}\n`; // ИНН организации
  receipt += `📍 ${companyInfo?.address || 'НЕ УКАЗАН'}\n`; // Место осуществления расчета
  receipt += `📞 ${companyInfo?.phone || 'НЕ УКАЗАН'}\n`;
  receipt += `📧 ${companyInfo?.email || 'info@helens-jungle.ru'}\n`;
  receipt += `🌐 ${companyInfo?.website || 'helens-jungle.ru'}\n\n`;
  
  // Налоговая система (обязательный реквизит)
  const taxSystemName = {
    'OSN': 'ОСН',
    'USN': 'УСН ДОХОД',
    'USN_EXPENSE': 'УСН ДОХОД-РАСХОД',
    'ESHN': 'ЕСХН',
    'PATENT': 'ПАТЕНТ'
  }[companyInfo?.taxSystem || 'USN'] || 'УСН ДОХОД';
  
  receipt += `🏛️ <b>Система налогообложения:</b> ${taxSystemName}\n\n`;
  
  // Информация об онлайн-кассе (обязательные реквизиты)
  receipt += `🖨️ <b>ОНЛАЙН-КАССА:</b>\n`;
  receipt += `🔢 РН ККТ: ${kassaInfo?.registrationNumber || 'НЕ УКАЗАН'}\n`; // Регистрационный номер ККТ
  receipt += `💾 ФН: ${kassaInfo?.fiscalStorageNumber || 'НЕ УКАЗАН'}\n`; // Заводской номер ФН
  receipt += `👤 Кассир: Система автоматического формирования чеков\n\n`; // Должность и фамилия
  
  // Дата, время и место (обязательные реквизиты)
  receipt += `📅 <b>Дата и время:</b> ${fiscalDateTime}\n`;
  receipt += `📋 <b>Чек №</b> ${receiptNumber}\n`; // Порядковый номер чека за смену
  receipt += `🔄 <b>Смена №</b> ${shiftNumber}\n`;
  receipt += `📄 <b>ФД №</b> ${fiscalDocumentNumber}\n\n`; // Порядковый номер фискального документа
  
  receipt += `═══════════════════════\n`;
  receipt += `📦 <b>ЗАКАЗ #${orderId}</b>\n`;
  receipt += `═══════════════════════\n\n`;
  
  // Постатейное разбитие товаров (обязательные реквизиты)
  let itemsTotal = 0;
  items.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    itemsTotal += itemTotal;
    
    // Наименование товара (до 128 символов)
    const itemName = item.name.length > 128 ? item.name.substring(0, 125) + '...' : item.name;
    
    receipt += `${index + 1}. <b>${itemName}</b>\n`; // Наименование товара
    receipt += `   Кол-во: ${item.quantity} шт.\n`; // Количество
    receipt += `   Цена: ${item.price.toFixed(2)} ₽\n`; // Цена за единицу
    receipt += `   Сумма: ${itemTotal.toFixed(2)} ₽\n`; // Стоимость товара
    
    // НДС (обязательный реквизит)
    if (companyInfo?.taxSystem === 'USN' || companyInfo?.taxSystem === 'USN_EXPENSE') {
      receipt += `   НДС: без НДС\n`;
    } else {
      const vatRate = item.vatRate || 20;
      const vatAmount = (itemTotal * vatRate) / (100 + vatRate);
      receipt += `   НДС ${vatRate}%: ${vatAmount.toFixed(2)} ₽\n`;
    }
    receipt += `\n`;
  });
  
  // Доставка (не включается в фискализацию)
  if (deliveryAmount > 0) {
    receipt += `🚚 <i>Доставка: ${deliveryAmount.toFixed(2)} ₽</i>\n`;
    receipt += `<i>💡 Доставка оплачивается отдельно при получении</i>\n\n`;
  }
  
  receipt += `═══════════════════════\n`;
  
  // Итоговые суммы (обязательные реквизиты)
  receipt += `💳 <b>ИТОГО: ${itemsTotal.toFixed(2)} ₽</b>\n`; // Сумма расчета
  
  // НДС итого (обязательный реквизит)
  if (companyInfo?.taxSystem === 'USN' || companyInfo?.taxSystem === 'USN_EXPENSE') {
    receipt += `💰 Сумма без НДС: ${itemsTotal.toFixed(2)} ₽\n`;
  } else {
    const totalVat = items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const vatRate = item.vatRate || 20;
      return sum + (itemTotal * vatRate) / (100 + vatRate);
    }, 0);
    receipt += `💰 В т.ч. НДС: ${totalVat.toFixed(2)} ₽\n`;
  }
  
  // Форма расчета (обязательный реквизит)
  const paymentMethodText = {
    'ozonpay': 'ЭЛЕКТРОННЫМИ',
    'card': 'ЭЛЕКТРОННЫМИ', 
    'balance': 'ЭЛЕКТРОННЫМИ',
    'bank_transfer': 'БЕЗНАЛИЧНЫЙ РАСЧЕТ'
  }[paymentMethod] || 'ЭЛЕКТРОННЫМИ';
  
  receipt += `💳 <b>${paymentMethodText}: ${itemsTotal.toFixed(2)} ₽</b>\n\n`; // Сумма оплаты по форме расчета
  
  // Данные покупателя (обязательный реквизит для электронной формы)
  if (user?.phone) {
    receipt += `📱 <b>Покупатель:</b> ${user.phone}\n`;
  }
  if (user?.email) {
    receipt += `📧 <b>Email:</b> ${user.email}\n`;
  }
  
  // Информация о транзакции
  if (transactionId) {
    receipt += `🔗 <b>ID транзакции:</b> <code>${transactionId}</code>\n`;
  }
  
  receipt += `\n═══════════════════════\n`;
  
  // Фискальный признак документа (обязательный реквизит)
  const fiscalSign = generateFiscalSign(receiptData);
  receipt += `🔐 <b>Фискальный признак:</b> ${fiscalSign}\n\n`;
  
  // Адрес сайта для проверки (обязательный реквизит)
  receipt += `ℹ️ <b>ПРОВЕРКА ЧЕКА:</b>\n`;
  receipt += `🌐 <b>Сайт ФНС:</b> www.nalog.ru\n`;
  receipt += `📱 <b>Приложение:</b> "Проверка чека ФНС России"\n\n`;
  
  // QR-код для проверки (обязательный реквизит)
  const qrData = generateQRCodeData(receiptData, fiscalSign, fiscalDocumentNumber);
  receipt += `📱 <b>QR-КОД ДЛЯ ПРОВЕРКИ:</b>\n`;
  receipt += `<code>${qrData}</code>\n\n`;
  
  receipt += `✅ <b>СПАСИБО ЗА ПОКУПКУ!</b>\n`;
  receipt += `🌱 <i>Helen's Jungle - Ваши зеленые друзья</i>\n`;
  receipt += `🏠 <i>Заказ будет доставлен по указанному адресу</i>`;
  
  return receipt;
}

// Генерация QR-кода для проверки чека (обязательный реквизит)
function generateQRCodeData(receiptData, fiscalSign, fiscalDocumentNumber) {
  const qrData = {
    t: receiptData.transactionId || '0', // ID транзакции
    s: receiptData.totalAmount.toFixed(2), // Сумма
    fn: '0000000000000000', // Номер ФН (заменить на реальный)
    i: fiscalDocumentNumber, // Номер ФД
    fp: fiscalSign, // Фискальный признак
    n: 1 // Признак расчета (1 - приход)
  };
  
  // Формируем строку QR-кода
  return `t=${qrData.t}&s=${qrData.s}&fn=${qrData.fn}&i=${qrData.i}&fp=${qrData.fp}&n=${qrData.n}`;
}

// Генерация условного фискального признака (в реальной системе это делает ФН)
function generateFiscalSign(receiptData) {
  const data = JSON.stringify({
    orderId: receiptData.orderId,
    total: receiptData.totalAmount,
    timestamp: Date.now()
  });
  
  return crypto.createHash('md5').update(data).digest('hex').substring(0, 10).toUpperCase();
}

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error('❌ Ошибка в боте:', err);
  console.error('Контекст:', ctx.update);
});

// Запуск бота
async function startBot() {
  try {
    // Создаем колонку telegram_chat_id если её нет
    ensureTelegramChatIdColumn();
    
    // Запускаем бота
    await bot.launch();
    
    console.log('✅ Улучшенный Telegram бот запущен успешно!');
    console.log('🔗 Ссылка на бота: https://t.me/jungle_plants_bot');
    console.log('📱 Для верификации: https://t.me/jungle_plants_bot?start=TOKEN');
    
    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error);
    process.exit(1);
  }
}

// Экспорт функций для использования в других файлах
module.exports = {
  sendOrderNotificationToUser,
  sendOrderStatusUpdateToUser,
  sendNewProductNotificationToAllUsers,
  sendUserOrdersStatus,
  sendFiscalReceiptToUser,
  bot
};

// Запуск бота, если файл запущен напрямую
if (require.main === module) {
  startBot();
} 