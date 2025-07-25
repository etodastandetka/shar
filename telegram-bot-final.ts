import { Telegraf, Markup } from 'telegraf';
import { markPhoneAsVerified, checkPendingRegistrations, getVerificationTokenByPhone } from './phone-verification';

// ТОКЕН БОТА ПРЯМО В КОДЕ
const BOT_TOKEN = '7894140077:AAGhJb9Gfmc2aY4ZCCNxnwK_PNMvTHEK6f0';

let bot: Telegraf;

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[^\d+]/g, '');
  
  if (normalized.startsWith('8')) {
    normalized = '+7' + normalized.slice(1);
  }
  
  if (normalized.startsWith('7') && !normalized.startsWith('+7')) {
    normalized = '+' + normalized;
  }
  
  if (!normalized.startsWith('+') && normalized.length === 11 && normalized.startsWith('7')) {
    normalized = '+' + normalized;
  }
  
  if (!normalized.startsWith('+') && normalized.length === 10) {
    normalized = '+7' + normalized;
  }
  
  console.log(`📞 Нормализация номера: "${phone}" -> "${normalized}"`);
  return normalized;
}

// Функция для поиска токена верификации по номеру телефона
function findVerificationTokenByPhone(phone: string): string | null {
  try {
    const normalizedPhone = normalizePhone(phone);
    const token = getVerificationTokenByPhone(normalizedPhone);
    console.log(`🔍 Поиск токена для номера ${normalizedPhone}: ${token ? 'НАЙДЕН' : 'НЕ НАЙДЕН'}`);
    return token;
  } catch (error) {
    console.error('❌ Ошибка при поиске токена:', error);
    return null;
  }
}

interface OrderNotificationData {
  orderId: string;
  userName: string;
  totalAmount: number;
  paymentMethod: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  orderStatus: string;
  paymentStatus: string;
}

interface NewProductNotificationData {
  productId: number;
  productName: string;
  productPrice: number;
  productImage?: string;
  productCategory: string;
  productDescription: string;
}

// Уведомление о заказе пользователю
export async function sendOrderNotificationToUser(userPhone: string, orderData: OrderNotificationData): Promise<boolean> {
  if (!bot) {
    console.log('🤖 Telegram бот не инициализирован');
    return false;
  }
  
  try {
    const { db } = await import('./db-sqlite');
    const normalizedPhone = normalizePhone(userPhone);
    
    const user = db.queryOne(
      "SELECT * FROM users WHERE phone = ?",
      [normalizedPhone]
    ) as any;
    
    if (!user || !user.telegram_chat_id) {
      console.log(`📱 Telegram ID не найден для номера ${normalizedPhone}`);
      return false;
    }
    
    const message = formatOrderNotificationMessage(orderData);
    
    await bot.telegram.sendMessage(user.telegram_chat_id, message, {
      parse_mode: 'HTML'
    });
    
    console.log(`✅ Уведомление о заказе #${orderData.orderId} отправлено пользователю ${user.telegram_chat_id}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о заказе:', error);
    return false;
  }
}

// Уведомление об изменении статуса заказа
export async function sendOrderStatusUpdateToUser(userPhone: string, orderData: OrderNotificationData): Promise<boolean> {
  if (!bot) {
    console.log('🤖 Telegram бот не инициализирован');
    return false;
  }
  
  try {
    const { db } = await import('./db-sqlite');
    const normalizedPhone = normalizePhone(userPhone);
    
    const user = db.queryOne(
      "SELECT * FROM users WHERE phone = ?",
      [normalizedPhone]
    ) as any;
    
    if (!user || !user.telegram_chat_id) {
      console.log(`📱 Telegram ID не найден для номера ${normalizedPhone}`);
      return false;
    }
    
    const message = formatOrderStatusMessage(orderData);
    
    await bot.telegram.sendMessage(user.telegram_chat_id, message, {
      parse_mode: 'HTML'
    });
    
    console.log(`✅ Уведомление об изменении статуса заказа #${orderData.orderId} отправлено`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления об изменении статуса:', error);
    return false;
  }
}

// НОВАЯ ФУНКЦИЯ: Уведомление о новом товаре всем пользователям
export async function sendNewProductNotificationToAllUsers(productData: NewProductNotificationData): Promise<number> {
  if (!bot) {
    console.log('🤖 Telegram бот не инициализирован');
    return 0;
  }
  
  try {
    const { db } = await import('./db-sqlite');
    
    const users = db.query(
      "SELECT telegram_chat_id FROM users WHERE telegram_chat_id IS NOT NULL AND telegram_chat_id != ''"
    ) as any[];
    
    if (users.length === 0) {
      console.log('📱 Нет пользователей с Telegram для уведомлений');
      return 0;
    }
    
    const message = formatNewProductMessage(productData);
    let sentCount = 0;
    
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegram_chat_id, message, {
          parse_mode: 'HTML'
        });
        sentCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Ошибка отправки пользователю ${user.telegram_chat_id}:`, error);
      }
    }
    
    console.log(`✅ Уведомление о новом товаре "${productData.productName}" отправлено ${sentCount} пользователям`);
    return sentCount;
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомлений о новом товаре:', error);
    return 0;
  }
}

// Получить статус заказов пользователя
export async function sendUserOrdersStatus(chatId: number): Promise<boolean> {
  if (!bot) {
    console.log('🤖 Telegram бот не инициализирован');
    return false;
  }
  
  try {
    const { db } = await import('./db-sqlite');
    
    const user = db.queryOne(
      "SELECT * FROM users WHERE telegram_chat_id = ?",
      [chatId.toString()]
    ) as any;
    
    if (!user) {
      await bot.telegram.sendMessage(chatId, 
        '❌ Пользователь не найден. Пожалуйста, пройдите регистрацию на сайте.',
        { parse_mode: 'HTML' }
      );
      return false;
    }
    
    const orders = db.query(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
      [user.id]
    ) as any[];
    
    if (orders.length === 0) {
      await bot.telegram.sendMessage(chatId, 
        '📦 У вас пока нет заказов.\n\n🌱 Посетите наш сайт helens-jungle.ru для оформления заказа!',
        { parse_mode: 'HTML' }
      );
      return true;
    }
    
    let message = `📦 <b>Ваши заказы (последние ${orders.length}):</b>\n\n`;
    
    orders.forEach(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('ru-RU');
      message += `🔸 <b>Заказ #${order.id}</b>\n`;
      message += `📅 ${orderDate}\n`;
      message += `💰 ${order.total_amount}₽\n`;
      message += `📋 Статус: ${getOrderStatusText(order.order_status)}\n`;
      message += `💸 Оплата: ${getPaymentStatusText(order.payment_status)}\n\n`;
    });
    
    message += `🌱 <i>Для подробной информации посетите личный кабинет на сайте</i>`;
    
    await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
    return true;
  } catch (error) {
    console.error('❌ Ошибка при получении статуса заказов:', error);
    await bot.telegram.sendMessage(chatId, 
      '❌ Произошла ошибка при получении информации о заказах.',
      { parse_mode: 'HTML' }
    );
    return false;
  }
}

function formatOrderNotificationMessage(orderData: OrderNotificationData): string {
  const itemsList = orderData.items.map(item => 
    `• ${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString('ru-RU')}₽`
  ).join('\n');
  
  const paymentMethodText = getPaymentMethodText(orderData.paymentMethod);
  const isCompleted = orderData.paymentStatus === 'verification';
  
  const title = isCompleted ? '✅ Ваш заказ успешно оформлен!' : '🛒 Ваш заказ принят!';
  const finalMessage = isCompleted ? 
    'Ваш заказ принят в обработку! Мы проверим подтверждение оплаты и свяжемся с вами.' :
    'Спасибо за ваш заказ! Мы свяжемся с вами для уточнения деталей доставки.';
  
  return `${title}
<b>Заказ #${orderData.orderId}</b>

🌱 <b>Заказанные растения:</b>
${itemsList}

💰 <b>Общая сумма:</b> ${orderData.totalAmount.toLocaleString('ru-RU')}₽
💳 <b>Способ оплаты:</b> ${paymentMethodText}

📋 <b>Статус заказа:</b> ${getOrderStatusText(orderData.orderStatus)}
💸 <b>Статус оплаты:</b> ${getPaymentStatusText(orderData.paymentStatus)}

${finalMessage}

🌿 <i>Helen's Jungle - Ваши зеленые друзья</i>`;
}

function formatOrderStatusMessage(orderData: OrderNotificationData): string {
  return `📦 <b>Статус заказа #${orderData.orderId} изменен</b>

📋 <b>Новый статус:</b> ${getOrderStatusText(orderData.orderStatus)}
💸 <b>Статус оплаты:</b> ${getPaymentStatusText(orderData.paymentStatus)}
💰 <b>Сумма:</b> ${orderData.totalAmount.toLocaleString('ru-RU')}₽

${getStatusDescription(orderData.orderStatus)}

🌿 <i>Helen's Jungle - Ваши зеленые друзья</i>`;
}

function formatNewProductMessage(productData: NewProductNotificationData): string {
  return `🌱 <b>Новое растение в каталоге!</b>

🏷️ <b>${productData.productName}</b>
💰 <b>Цена:</b> ${productData.productPrice.toLocaleString('ru-RU')}₽
📂 <b>Категория:</b> ${productData.productCategory}

📝 <b>Описание:</b>
${productData.productDescription}

🛒 <b>Заказать:</b> https://helens-jungle.ru/product/${productData.productId}

🌿 <i>Helen's Jungle - Пополнение в наших джунглях!</i>`;
}

function getPaymentMethodText(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'ozonpay': return 'Ozon Pay';
    case 'balance': return 'Баланс аккаунта';
    case 'bank_transfer': return 'Банковский перевод';
    case 'card': return 'Банковская карта';
    default: return paymentMethod;
  }
}

function getOrderStatusText(status: string): string {
  switch (status) {
    case 'pending': return '⏳ Ожидает обработки';
    case 'processing': return '⚙️ Обрабатывается';
    case 'shipped': return '🚚 Отправлен';
    case 'delivered': return '✅ Доставлен';
    case 'cancelled': return '❌ Отменен';
    default: return status;
  }
}

function getPaymentStatusText(status: string): string {
  switch (status) {
    case 'pending': return '⏳ Ожидает оплаты';
    case 'paid': return '✅ Оплачен';
    case 'verification': return '🔍 Проверка оплаты';
    case 'failed': return '❌ Ошибка оплаты';
    default: return status;
  }
}

function getStatusDescription(status: string): string {
  switch (status) {
    case 'pending': return 'Ваш заказ получен и ожидает обработки.';
    case 'processing': return 'Мы подготавливаем ваш заказ к отправке.';
    case 'shipped': return 'Ваш заказ отправлен! Ожидайте доставку.';
    case 'delivered': return 'Заказ успешно доставлен. Наслаждайтесь вашими растениями!';
    case 'cancelled': return 'Заказ был отменен.';
    default: return '';
  }
}

export async function startTelegramBot() {
  try {
    console.log('🤖 Запуск улучшенного Telegram бота...');
    console.log('🔑 Токен установлен прямо в коде');
    
    if (!BOT_TOKEN) {
      console.error('❌ BOT_TOKEN не установлен в коде!');
      throw new Error('BOT_TOKEN is required');
    }

    bot = new Telegraf(BOT_TOKEN);
    const userTokens = new Map<number, string>();

    // Команда /start с токеном верификации
    bot.command('start', async (ctx) => {
      try {
        const startCode = ctx.message.text.split(' ')[1];
        const chatId = ctx.from.id;
        
        if (startCode) {
          userTokens.set(chatId, startCode);
          
          console.log(`🔑 Получен токен верификации: ${startCode} для пользователя ${chatId}`);
          
          const keyboard = Markup.keyboard([
            [Markup.button.contactRequest('📱 Отправить номер телефона')]
          ]).resize();

          await ctx.reply(
            `🌱 <b>Добро пожаловать в Helen's Jungle!</b>\n\n` +
            `Для подтверждения регистрации, пожалуйста, отправьте свой номер телефона.\n\n` +
            `Нажмите кнопку ниже или отправьте номер текстом.`,
            {
              parse_mode: 'HTML',
              ...keyboard
            }
          );
        } else {
          const keyboard = Markup.keyboard([
            ['📦 Мои заказы', '🌱 Новые товары'],
            ['🔗 Перейти на сайт']
          ]).resize();

          await ctx.reply(
            `🌱 <b>Добро пожаловать в Helen's Jungle!</b>\n\n` +
            `🪴 Ваш магазин комнатных растений\n\n` +
            `Выберите действие:`,
            {
              parse_mode: 'HTML',
              ...keyboard
            }
          );
        }
      } catch (error) {
        console.error('Ошибка в команде /start:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Команда /orders - показать заказы пользователя
    bot.command('orders', async (ctx) => {
      await sendUserOrdersStatus(ctx.from.id);
    });

    // Команда /help - помощь
    bot.command('help', async (ctx) => {
      await ctx.reply(
        `🌱 <b>Helen's Jungle - Команды бота:</b>\n\n` +
        `📦 /orders - Мои заказы\n` +
        `🔗 /site - Перейти на сайт\n` +
        `ℹ️ /help - Эта справка\n\n` +
        `🌿 <i>Для верификации номера используйте ссылку с сайта</i>`,
        { parse_mode: 'HTML' }
      );
    });

    // Команда /site - ссылка на сайт
    bot.command('site', async (ctx) => {
      await ctx.reply(
        `🌱 <b>Helen's Jungle</b>\n\n` +
        `🔗 Наш сайт: https://helens-jungle.ru\n` +
        `📱 Telegram канал: @helensjungle\n\n` +
        `🌿 <i>Превращаем ваш дом в уютные джунгли!</i>`,
        { parse_mode: 'HTML' }
      );
    });

    // Обработка получения контакта
    bot.on('contact', async (ctx) => {
      try {
        const phoneNumber = ctx.message.contact.phone_number;
        const chatId = ctx.from.id;
        let userToken = userTokens.get(chatId);
        
        console.log(`📱 Получен контакт: ${phoneNumber} от пользователя ${chatId}`);
        
        const normalizedPhone = normalizePhone(phoneNumber);
        
                  // Если токен не найден в памяти, ищем в базе данных
          if (!userToken) {
            console.log(`🔍 Токен не найден в памяти, ищем в базе данных...`);
            const foundToken = findVerificationTokenByPhone(normalizedPhone);
            
            if (foundToken) {
              userToken = foundToken;
              console.log(`✅ Токен найден в базе данных: ${userToken}`);
              userTokens.set(chatId, userToken); // Сохраняем в память для будущего использования
            }
          }
        
        if (!userToken) {
          await ctx.reply(
            `❌ <b>Токен верификации не найден</b>\n\n` +
            `Возможные причины:\n` +
            `• Процесс регистрации не был начат на сайте\n` +
            `• Токен устарел (попробуйте зарегистрироваться заново)\n\n` +
            `Пожалуйста, перейдите по ссылке с сайта для начала процесса регистрации.`,
            { 
              parse_mode: 'HTML',
              ...Markup.removeKeyboard()
            }
          );
          return;
        }

        console.log(`🔍 Проверяем номер: ${normalizedPhone} с токеном: ${userToken}`);
        
        const verified = markPhoneAsVerified(normalizedPhone, userToken);
        
        if (verified) {
          try {
            const { db } = await import('./db-sqlite');
            
            try {
              db.exec('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT');
              console.log('✅ Столбец telegram_chat_id добавлен');
            } catch (error) {
              console.log('📋 Столбец telegram_chat_id уже существует');
            }
            
            const updateResult = db.run(
              'UPDATE users SET telegram_chat_id = ? WHERE phone = ?',
              [chatId.toString(), normalizedPhone]
            );
            
            if (updateResult.changes > 0) {
              console.log(`✅ Telegram chat ID ${chatId} сохранен для номера ${normalizedPhone}`);
            }
          } catch (error) {
            console.error('❌ Ошибка при сохранении Telegram chat ID:', error);
          }
          
          const keyboard = Markup.keyboard([
            ['📦 Мои заказы', '🔗 Перейти на сайт']
          ]).resize();

          await ctx.reply(
            `✅ <b>Отлично!</b>\n\n` +
            `Ваш номер телефона <code>${phoneNumber}</code> успешно подтвержден.\n\n` +
            `Теперь вернитесь на сайт и нажмите <b>"Я подтвердил номер"</b> для завершения регистрации.\n\n` +
            `🔔 Вы будете получать уведомления о ваших заказах и новых товарах в этот чат.`,
            { 
              parse_mode: 'HTML',
              ...keyboard
            }
          );
          
          userTokens.delete(chatId);
          console.log(`✅ Номер ${normalizedPhone} подтвержден успешно`);
        } else {
          await ctx.reply(
            `❌ <b>Не удалось подтвердить номер телефона</b>\n\n` +
            `Возможные причины:\n` +
            `• Токен устарел или недействителен\n` +
            `• Номер не соответствует данным регистрации\n\n` +
            `Попробуйте начать процесс регистрации заново на сайте.`,
            { 
              parse_mode: 'HTML',
              ...Markup.removeKeyboard()
            }
          );
          console.log(`❌ Не удалось подтвердить номер ${normalizedPhone} с токеном ${userToken}`);
        }
      } catch (error) {
        console.error('Ошибка при обработке контакта:', error);
        await ctx.reply(
          '❌ Произошла ошибка при подтверждении номера. Попробуйте позже.',
          Markup.removeKeyboard()
        );
      }
    });

    // Обработка текстовых сообщений
    bot.on('text', async (ctx) => {
      try {
        const text = ctx.message.text;
        const chatId = ctx.from.id;
        
        // Обработка кнопок меню
        if (text === '📦 Мои заказы') {
          await sendUserOrdersStatus(chatId);
          return;
        }
        
        if (text === '🔗 Перейти на сайт') {
          await ctx.reply(
            `🌱 <b>Helen's Jungle</b>\n\n` +
            `🔗 https://helens-jungle.ru\n\n` +
            `🌿 <i>Ваш магазин комнатных растений</i>`,
            { parse_mode: 'HTML' }
          );
          return;
        }
        
        if (text === '🌱 Новые товары') {
          await ctx.reply(
            `🌱 <b>Следите за новинками!</b>\n\n` +
            `🔔 Вы будете получать уведомления о новых товарах автоматически.\n\n` +
            `🔗 Каталог: https://helens-jungle.ru/catalog\n` +
            `📱 Канал: @helensjungle`,
            { parse_mode: 'HTML' }
          );
          return;
        }
        
        // Проверяем, является ли текст номером телефона
        if (/^\+?[0-9\s\-\(\)]+$/.test(text)) {
          let userToken = userTokens.get(chatId);
          const normalizedPhone = normalizePhone(text);
          
          console.log(`📝 Получен текстовый номер: ${normalizedPhone} от пользователя ${chatId}`);
          
          // Если токен не найден в памяти, ищем в базе данных
          if (!userToken) {
            console.log(`🔍 Токен не найден в памяти, ищем в базе данных для номера ${normalizedPhone}...`);
            const foundToken = findVerificationTokenByPhone(normalizedPhone);
            
            if (foundToken) {
              userToken = foundToken;
              console.log(`✅ Токен найден в базе данных: ${userToken}`);
              userTokens.set(chatId, userToken); // Сохраняем в память для будущего использования
            }
          }
          
          if (!userToken) {
            await ctx.reply(
              `❌ <b>Токен верификации не найден</b>\n\n` +
              `Возможные причины:\n` +
              `• Процесс регистрации не был начат на сайте для этого номера\n` +
              `• Токен устарел (попробуйте зарегистрироваться заново)\n\n` +
              `Пожалуйста, перейдите по ссылке с сайта для начала процесса регистрации.`,
              { parse_mode: 'HTML' }
            );
            return;
          }
          
          const verified = markPhoneAsVerified(normalizedPhone, userToken);
          
          if (verified) {
            await ctx.reply(
              `✅ <b>Отлично!</b>\n\n` +
              `Ваш номер телефона <code>${text}</code> успешно подтвержден.\n\n` +
              `Теперь вернитесь на сайт и нажмите <b>"Я подтвердил номер"</b> для завершения регистрации.`,
              { parse_mode: 'HTML' }
            );
            
            userTokens.delete(chatId);
            console.log(`✅ Текстовый номер ${normalizedPhone} подтвержден успешно`);
          } else {
            await ctx.reply(
              `❌ <b>Не удалось подтвердить номер телефона</b>\n\n` +
              `Убедитесь, что вы вводите тот же номер, который указали при регистрации на сайте.`,
              { parse_mode: 'HTML' }
            );
          }
          return;
        }

        // Обработка других сообщений
        const keyboard = Markup.keyboard([
          ['📦 Мои заказы', '🌱 Новые товары'],
          ['🔗 Перейти на сайт']
        ]).resize();

        await ctx.reply(
          `🌱 <b>Helen's Jungle</b>\n\n` +
          `Выберите действие из меню или используйте команды:\n` +
          `📦 /orders - Мои заказы\n` +
          `🔗 /site - Перейти на сайт\n` +
          `ℹ️ /help - Помощь`,
          { 
            parse_mode: 'HTML',
            ...keyboard
          }
        );
      } catch (error) {
        console.error('Ошибка при обработке текста:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработка ошибок
    bot.catch((err, ctx) => {
      console.error('Ошибка бота:', err);
      console.error('Контекст:', ctx.update);
    });
    
    console.log(`🔑 Токен: ${BOT_TOKEN ? 'Установлен' : 'НЕ УСТАНОВЛЕН'}`);
    
    await bot.launch();
    
    console.log('✅ Улучшенный Telegram бот запущен успешно!');
    console.log(`🔗 Ссылка на бота: https://t.me/${bot.botInfo?.username || 'unknown'}`);
    console.log('🚀 Функции бота:');
    console.log('   📱 Верификация номеров телефонов');
    console.log('   📦 Уведомления о заказах и статусах');
    console.log('   🌱 Уведомления о новых товарах');
    console.log('   📋 Просмотр статуса заказов');
    
    // Graceful stop
    process.once('SIGINT', () => {
      console.log('🛑 Остановка бота...');
      bot.stop('SIGINT');
    });
    
    process.once('SIGTERM', () => {
      console.log('🛑 Остановка бота...');
      bot.stop('SIGTERM');
    });
    
  } catch (error) {
    console.error('❌ Ошибка запуска улучшенного бота:', error);
    throw error;
  }
}

export { bot };

// Автоматический запуск бота если файл запускается напрямую
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('telegram-bot.cjs')) {
  console.log('🚀 Запуск Telegram бота как отдельного процесса...');
  startTelegramBot().catch(error => {
    console.error('❌ Критическая ошибка запуска бота:', error);
    process.exit(1);
  });
}
 