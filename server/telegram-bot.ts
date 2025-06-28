import { markPhoneAsVerified, getVerificationTokenByPhone } from './phone-verification';

// Простой Telegram бот для подтверждения номеров телефонов
// В реальном проекте используйте библиотеку как node-telegram-bot-api или telegraf

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7064896650:AAFv7TivRHHMFf4sendrcf_qam869BPogMY';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://helens-jungle.ru/api/telegram/webhook';

// Интерфейсы для типизации Telegram API
interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  contact?: {
    phone_number: string;
    first_name: string;
    last_name?: string;
    user_id?: number;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// Хранилище токенов пользователей (в продакшене лучше использовать базу данных)
const userTokens = new Map<number, string>();

// Функция для отправки сообщения в Telegram
async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        reply_markup: replyMarkup,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send Telegram message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

// Обработка обновлений от Telegram
export async function handleTelegramUpdate(update: TelegramUpdate) {
  try {
    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text;

    // Обработка команды /start с токеном
    if (text?.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        const token = parts[1];
        // Сохраняем токен для этого пользователя
        userTokens.set(chatId, token);
        
        await sendMessage(chatId, 
          `Добро пожаловать! 🌱\n\n` +
          `Для подтверждения регистрации на Jungle Plants, пожалуйста, отправьте свой номер телефона.\n\n` +
          `Нажмите кнопку "Поделиться контактом" ниже или отправьте номер телефона текстом.`,
          {
            reply_markup: {
              keyboard: [[{
                text: "📱 Поделиться контактом",
                request_contact: true
              }]],
              one_time_keyboard: true,
              resize_keyboard: true
            }
          }
        );
      } else {
        await sendMessage(chatId, 
          `Добро пожаловать в Jungle Plants! 🌱\n\n` +
          `Для подтверждения регистрации используйте ссылку с сайта.`
        );
      }
      return;
    }

    // Обработка контакта
    if (message.contact) {
      const phoneNumber = message.contact.phone_number;
      const userToken = userTokens.get(chatId);
      
      if (!userToken) {
        await sendMessage(chatId, 
          `❌ Токен верификации не найден.\n\n` +
          `Пожалуйста, перейдите по ссылке с сайта для начала процесса регистрации.`
        );
        return;
      }

      // Нормализуем номер телефона
      const normalizedPhone = phoneNumber.replace(/[^\d+]/g, '');
      
      // Подтверждаем телефон
      const verified = markPhoneAsVerified(normalizedPhone, userToken);
      
      if (verified) {
        await sendMessage(chatId, 
          `✅ Отлично!\n\n` +
          `Ваш номер телефона ${phoneNumber} успешно подтвержден.\n\n` +
          `Теперь вернитесь на сайт и нажмите "Я подтвердил номер" для завершения регистрации.`
        );
        
        // Удаляем токен из памяти
        userTokens.delete(chatId);
      } else {
        await sendMessage(chatId, 
          `❌ Не удалось подтвердить номер телефона.\n\n` +
          `Возможно, токен устарел или номер не соответствует данным регистрации.\n\n` +
          `Попробуйте начать процесс регистрации заново на сайте.`
        );
      }
      return;
    }

    // Обработка текстового сообщения с номером телефона
    if (text && /^\+?[0-9\s\-\(\)]+$/.test(text)) {
      const userToken = userTokens.get(chatId);
      
      if (!userToken) {
        await sendMessage(chatId, 
          `❌ Токен верификации не найден.\n\n` +
          `Пожалуйста, перейдите по ссылке с сайта для начала процесса регистрации.`
        );
        return;
      }

      // Нормализуем номер телефона
      const normalizedPhone = text.replace(/[^\d+]/g, '');
      
      // Подтверждаем телефон
      const verified = markPhoneAsVerified(normalizedPhone, userToken);
      
      if (verified) {
        await sendMessage(chatId, 
          `✅ Отлично!\n\n` +
          `Ваш номер телефона ${text} успешно подтвержден.\n\n` +
          `Теперь вернитесь на сайт и нажмите "Я подтвердил номер" для завершения регистрации.`
        );
        
        // Удаляем токен из памяти
        userTokens.delete(chatId);
      } else {
        await sendMessage(chatId, 
          `❌ Не удалось подтвердить номер телефона.\n\n` +
          `Убедитесь, что вы вводите тот же номер, который указали при регистрации на сайте.\n\n` +
          `Если проблема повторяется, попробуйте начать процесс регистрации заново.`
        );
      }
      return;
    }

    // Обработка других сообщений
    await sendMessage(chatId, 
      `Пожалуйста, отправьте свой номер телефона для подтверждения регистрации.\n\n` +
      `Используйте кнопку "Поделиться контактом" или отправьте номер текстом.`
    );

  } catch (error) {
    console.error('Ошибка при обработке обновления Telegram:', error);
  }
}

// Настройка webhook (вызывается при запуске сервера)
export async function setupTelegramWebhook() {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN') {
    console.log('Telegram bot token not configured, skipping webhook setup');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
      }),
    });

    if (response.ok) {
      console.log('Telegram webhook configured successfully');
    } else {
      console.error('Failed to configure Telegram webhook:', await response.text());
    }
  } catch (error) {
    console.error('Error configuring Telegram webhook:', error);
  }
}

// Отправка сообщения в Telegram
export async function sendMessage(chatId: number, text: string, options: any = {}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN не установлен');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        ...options
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Ошибка при отправке сообщения в Telegram:', error);
    }
  } catch (error) {
    console.error('Ошибка при отправке сообщения в Telegram:', error);
  }
}