const { Telegraf } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ТОКЕН БОТА (встроен в код)
const BOT_TOKEN = '7894140077:AAGhJb9Gfmc2aY4ZCCNxnwK_PNMvTHEK6f0';

// Создаем экземпляр бота
const bot = new Telegraf(BOT_TOKEN);

// Путь к базе данных
const DB_PATH = path.join(__dirname, '..', 'db', 'database.sqlite');

console.log('🤖 Запуск Telegram бота...');
console.log('📁 Путь к базе данных:', DB_PATH);

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
      [chatId.toString(), userId],
      function(err) {
        if (err) {
          console.error('❌ Ошибка обновления telegram_chat_id:', err);
          reject(err);
        } else {
          console.log(`✅ Обновлен telegram_chat_id для пользователя ${userId}: ${chatId}`);
          resolve(this.changes);
        }
        db.close();
      }
    );
  });
}

// Функция для подтверждения номера телефона
function confirmPhoneVerification(userId, phoneNumber) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    db.run(
      'UPDATE users SET phone_verified = 1, phone_verification_token = NULL WHERE id = ?',
      [userId],
      function(err) {
        if (err) {
          console.error('❌ Ошибка подтверждения номера телефона:', err);
          reject(err);
        } else {
          console.log(`✅ Номер телефона подтвержден для пользователя ${userId}: ${phoneNumber}`);
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

// КОМАНДА /start
bot.start(async (ctx) => {
  const chatId = ctx.chat.id;
  const startPayload = ctx.startPayload; // Токен из ссылки
  
  console.log(`📱 Получена команда /start от пользователя ${chatId}, токен: ${startPayload}`);
  
  if (startPayload) {
    // Это верификация номера телефона
    try {
      const user = await getUserByToken(startPayload);
      
      if (user) {
        // Сохраняем chat_id пользователя
        await updateUserTelegramChatId(user.id, chatId);
        
        await ctx.reply(
          `Привет, ${user.email}!\n\n` +
          `Для подтверждения номера телефона, пожалуйста, отправьте свой контакт, нажав кнопку ниже.`,
          {
            reply_markup: {
              keyboard: [
                [{ text: 'Отправить номер телефона', request_contact: true }]
              ],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          }
        );
      } else {
        await ctx.reply('Недействительный токен верификации. Попробуйте зарегистрироваться заново.');
      }
    } catch (error) {
      console.error('❌ Ошибка при верификации:', error);
      await ctx.reply('Произошла ошибка при верификации. Попробуйте позже.');
    }
  } else {
    // Обычный запуск бота
    await ctx.reply(
      'Добро пожаловать в Jungle Plants!\n\n' +
      'Здесь вы можете:\n' +
      '• Проверить статус своих заказов\n' +
      '• Получать уведомления о новых товарах\n' +
      '• Быстро перейти на наш сайт\n\n' +
      'Выберите действие:',
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
    
    if (user) {
      // Подтверждаем номер телефона
      await confirmPhoneVerification(user.id, phoneNumber);
      
      await ctx.reply(
        'Номер телефона успешно подтвержден!\n\n' +
        'Теперь вы можете вернуться на сайт и завершить регистрацию.\n\n' +
        'Перейти на сайт: https://helens-jungle.ru',
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
      await ctx.reply('Пользователь не найден. Попробуйте зарегистрироваться заново.');
    }
  } catch (error) {
    console.error('❌ Ошибка при подтверждении номера:', error);
    await ctx.reply('Произошла ошибка при подтверждении номера. Попробуйте позже.');
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

// КОМАНДА /help и кнопка "Помощь"
async function handleHelpCommand(ctx) {
  await ctx.reply(
    'Помощь по боту Jungle Plants\n\n' +
    'Доступные команды:\n' +
    '/start - Главное меню\n' +
    '/orders - Мои заказы\n' +
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

// Кнопка "Новые товары"
bot.hears('Новые товары', async (ctx) => {
  await ctx.reply(
    'Новые товары\n\n' +
    'Мы регулярно добавляем новые растения в наш каталог!\n' +
    'Вы будете получать уведомления о всех новинках.\n\n' +
    'Посмотреть каталог: https://helens-jungle.ru/catalog\n' +
    'Следите за новостями: @helensjungle'
  );
});

// ФУНКЦИИ ДЛЯ ОТПРАВКИ УВЕДОМЛЕНИЙ (экспорт для использования в других файлах)

// Отправка уведомления о заказе пользователю
async function sendOrderNotificationToUser(userId, orderData) {
  try {
    const user = await getUserByChatId(userId);
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
    const user = await getUserByChatId(userId);
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
  bot
};

// Запуск бота, если файл запущен напрямую
if (require.main === module) {
  startBot();
} 