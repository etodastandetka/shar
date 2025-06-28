import { Telegraf, Markup } from 'telegraf';
import { markPhoneAsVerified, checkPendingRegistrations } from './phone-verification';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Переменные для бота (инициализируются в функции startTelegramBot)
let bot: Telegraf;
let botToken: string;

// Нормализация номера телефона (такая же, как в phone-verification.ts)
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
  
  console.log(`📞 Нормализация номера в боте: "${phone}" -> "${normalized}"`);
  return normalized;
}

// Интерфейс для данных заказа
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

// Функция для отправки уведомления о заказе пользователю
export async function sendOrderNotificationToUser(userPhone: string, orderData: OrderNotificationData): Promise<boolean> {
  if (!bot) {
    console.log('🤖 Telegram бот не инициализирован');
    return false;
  }
  
  try {
    // Находим Telegram ID пользователя по номеру телефона
    const { db } = await import('./db-sqlite');
    const normalizedPhone = normalizePhone(userPhone);
    
    // Ищем пользователя в базе данных по номеру телефона
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

// Функция для отправки уведомления об изменении статуса заказа
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
    
    console.log(`✅ Уведомление об изменении статуса заказа #${orderData.orderId} отправлено пользователю ${user.telegram_chat_id}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления об изменении статуса:', error);
    return false;
  }
}

// Форматирование сообщения о новом заказе
function formatOrderNotificationMessage(orderData: OrderNotificationData): string {
  const itemsList = orderData.items.map(item => 
    `• ${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString('ru-RU')}₽`
  ).join('\n');
  
  const paymentMethodText = getPaymentMethodText(orderData.paymentMethod);
  
  // Определяем, завершен ли заказ (есть подтверждение оплаты)
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

🌿 <i>Jungle Plants - Ваши зеленые друзья</i>`;
}

// Форматирование сообщения об изменении статуса
function formatOrderStatusMessage(orderData: OrderNotificationData): string {
  return `📦 <b>Статус заказа #${orderData.orderId} изменен</b>

📋 <b>Новый статус:</b> ${getOrderStatusText(orderData.orderStatus)}
💸 <b>Статус оплаты:</b> ${getPaymentStatusText(orderData.paymentStatus)}
💰 <b>Сумма:</b> ${orderData.totalAmount.toLocaleString('ru-RU')}₽

${getStatusDescription(orderData.orderStatus)}

🌿 <i>Jungle Plants - Ваши зеленые друзья</i>`;
}

// Получение текста способа оплаты
function getPaymentMethodText(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'ozonpay':
      return 'Ozon Pay';
    case 'balance':
      return 'Баланс аккаунта';
    case 'bank_transfer':
      return 'Банковский перевод';
    case 'card':
      return 'Банковская карта';
    default:
      return paymentMethod;
  }
}

// Получение текста статуса заказа
function getOrderStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳ Ожидает обработки';
    case 'processing':
      return '⚙️ Обрабатывается';
    case 'shipped':
      return '🚚 Отправлен';
    case 'delivered':
      return '✅ Доставлен';
    case 'cancelled':
      return '❌ Отменен';
    default:
      return status;
  }
}

// Получение текста статуса оплаты
function getPaymentStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return '⏳ Ожидает оплаты';
    case 'completed':
      return '✅ Оплачен';
    case 'failed':
      return '❌ Ошибка оплаты';
    case 'pending_verification':
      return '🔍 Проверяется';
    case 'verification':
      return '🔍 Проверяется администратором';
    default:
      return status;
  }
}

// Получение описания статуса
function getStatusDescription(status: string): string {
  switch (status) {
    case 'pending':
      return 'Ваш заказ получен и ожидает обработки. Мы свяжемся с вами в ближайшее время.';
    case 'processing':
      return 'Ваш заказ обрабатывается. Мы подготавливаем растения к отправке.';
    case 'shipped':
      return 'Ваш заказ отправлен! Вы получите трек-номер для отслеживания.';
    case 'delivered':
      return 'Ваш заказ успешно доставлен! Надеемся, вам понравятся ваши новые растения.';
    case 'cancelled':
      return 'Ваш заказ был отменен. Если у вас есть вопросы, свяжитесь с нами.';
    default:
      return '';
  }
}

// Функция для запуска бота
export async function startTelegramBot() {
  try {
    console.log('🤖 Запуск Telegram бота...');
    console.log('🔍 Проверка токена бота...');
    console.log('📁 Переменные окружения загружены');
    
    // Проверка токена бота
    botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    console.log(`🔑 TELEGRAM_BOT_TOKEN: ${botToken ? 'НАЙДЕН' : 'НЕ НАЙДЕН'}`);
    
    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env файле');
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    // Инициализация бота
    bot = new Telegraf(botToken);

    // Хранилище токенов пользователей (в памяти)
    const userTokens = new Map<number, string>();

    // Обработка команды /start с токеном
    bot.command('start', async (ctx) => {
      try {
        const startCode = ctx.message.text.split(' ')[1];
        const chatId = ctx.from.id;
        
        if (startCode) {
          // Сохраняем токен для этого пользователя
          userTokens.set(chatId, startCode);
          
          console.log(`🔑 Получен токен верификации: ${startCode} для пользователя ${chatId}`);
          
          // Создаем клавиатуру с кнопкой отправки контакта
          const keyboard = Markup.keyboard([
            [Markup.button.contactRequest('📱 Отправить номер телефона')]
          ]).resize();

          await ctx.reply(
            `🌱 <b>Добро пожаловать в Jungle Plants!</b>\n\n` +
            `Для подтверждения регистрации, пожалуйста, отправьте свой номер телефона.\n\n` +
            `Нажмите кнопку ниже или отправьте номер текстом.`,
            {
              parse_mode: 'HTML',
              ...keyboard
            }
          );
        } else {
          await ctx.reply(
            `🌱 <b>Добро пожаловать в Jungle Plants!</b>\n\n` +
            `Для подтверждения регистрации используйте ссылку с сайта.`,
            { parse_mode: 'HTML' }
          );
        }
      } catch (error) {
        console.error('Ошибка в команде /start:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработка получения контакта
    bot.on('contact', async (ctx) => {
      try {
        const phoneNumber = ctx.message.contact.phone_number;
        const chatId = ctx.from.id;
        const userToken = userTokens.get(chatId);
        
        console.log(`📱 Получен контакт: ${phoneNumber} от пользователя ${chatId}`);
        console.log(`📱 Полная информация о контакте:`, JSON.stringify(ctx.message.contact, null, 2));
        
        if (!userToken) {
          await ctx.reply(
            `❌ <b>Токен верификации не найден</b>\n\n` +
            `Пожалуйста, перейдите по ссылке с сайта для начала процесса регистрации.`,
            { 
              parse_mode: 'HTML',
              ...Markup.removeKeyboard()
            }
          );
          return;
        }

        // Нормализуем номер телефона с помощью нашей функции
        const normalizedPhone = normalizePhone(phoneNumber);
        
        console.log(`🔍 Проверяем номер: ${normalizedPhone} с токеном: ${userToken}`);
        
        // Добавляем отладочную информацию о том, что находится в базе данных
        const pendingData = checkPendingRegistrations(userToken);
        console.log(`🔍 Данные в базе для токена ${userToken}:`, pendingData);
        
        // Подтверждаем телефон в нашей системе
        const verified = markPhoneAsVerified(normalizedPhone, userToken);
        
        if (verified) {
          // Сохраняем Telegram chat ID пользователя в базе данных
          try {
            const { db } = await import('./db-sqlite');
            
            // Сначала создаем столбец telegram_chat_id если его нет
            try {
              db.exec('ALTER TABLE users ADD COLUMN telegram_chat_id TEXT');
              console.log('✅ Столбец telegram_chat_id добавлен в таблицу users');
            } catch (error) {
              // Столбец уже существует, это нормально
              console.log('📋 Столбец telegram_chat_id уже существует');
            }
            
            // Обновляем telegram_chat_id для пользователя с данным номером телефона
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
          
          await ctx.reply(
            `✅ <b>Отлично!</b>\n\n` +
            `Ваш номер телефона <code>${phoneNumber}</code> успешно подтвержден.\n\n` +
            `Теперь вернитесь на сайт и нажмите <b>"Я подтвердил номер"</b> для завершения регистрации.\n\n` +
            `🔔 Вы будете получать уведомления о ваших заказах в этот чат.`,
            { 
              parse_mode: 'HTML',
              ...Markup.removeKeyboard()
            }
          );
          
          // Удаляем токен из памяти
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

    // Обработка текстовых сообщений с номером телефона
    bot.on('text', async (ctx) => {
      try {
        const text = ctx.message.text;
        const chatId = ctx.from.id;
        
        // Проверяем, является ли текст номером телефона
        if (/^\+?[0-9\s\-\(\)]+$/.test(text)) {
          const userToken = userTokens.get(chatId);
          
          if (!userToken) {
            await ctx.reply(
              `❌ <b>Токен верификации не найден</b>\n\n` +
              `Пожалуйста, перейдите по ссылке с сайта для начала процесса регистрации.`,
              { parse_mode: 'HTML' }
            );
            return;
          }

          // Нормализуем номер телефона с помощью нашей функции
          const normalizedPhone = normalizePhone(text);
          
          console.log(`📝 Получен текстовый номер: ${normalizedPhone} от пользователя ${chatId}`);
          
          // Добавляем отладочную информацию о том, что находится в базе данных
          const pendingData = checkPendingRegistrations(userToken);
          console.log(`🔍 Данные в базе для токена ${userToken}:`, pendingData);
          
          // Подтверждаем телефон в нашей системе
          const verified = markPhoneAsVerified(normalizedPhone, userToken);
          
          if (verified) {
            await ctx.reply(
              `✅ <b>Отлично!</b>\n\n` +
              `Ваш номер телефона <code>${text}</code> успешно подтвержден.\n\n` +
              `Теперь вернитесь на сайт и нажмите <b>"Я подтвердил номер"</b> для завершения регистрации.`,
              { parse_mode: 'HTML' }
            );
            
            // Удаляем токен из памяти
            userTokens.delete(chatId);
            console.log(`✅ Текстовый номер ${normalizedPhone} подтвержден успешно`);
          } else {
            await ctx.reply(
              `❌ <b>Не удалось подтвердить номер телефона</b>\n\n` +
              `Убедитесь, что вы вводите тот же номер, который указали при регистрации на сайте.\n\n` +
              `Если проблема повторяется, попробуйте начать процесс регистрации заново.`,
              { parse_mode: 'HTML' }
            );
            console.log(`❌ Не удалось подтвердить текстовый номер ${normalizedPhone} с токеном ${userToken}`);
          }
          return;
        }

        // Обработка других текстовых сообщений
        await ctx.reply(
          `Пожалуйста, отправьте свой номер телефона для подтверждения регистрации.\n\n` +
          `Используйте кнопку <b>"📱 Отправить номер телефона"</b> или отправьте номер текстом.`,
          { parse_mode: 'HTML' }
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
    
    console.log(`🔑 Токен: ${botToken ? 'Установлен' : 'НЕ УСТАНОВЛЕН'}`);
    
    await bot.launch();
    
    console.log('✅ Telegram бот запущен успешно!');
    console.log(`🔗 Ссылка на бота: https://t.me/${bot.botInfo?.username || 'unknown'}`);
    
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
    console.error('❌ Ошибка запуска бота:', error);
    console.error('Проверьте правильность TELEGRAM_BOT_TOKEN в .env файле');
  }
}

// Экспортируем бота для использования в других модулях
export { bot }; 