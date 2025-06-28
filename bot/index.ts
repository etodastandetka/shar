import { Telegraf, Markup } from 'telegraf';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { config } from './config';
import { VerificationData } from './types';
import { generateVerificationCode, isVerificationCodeExpired, cleanupExpiredCodes } from './utils';

dotenv.config();

// Инициализация бота
const bot = new Telegraf(config.token);

// Подключение к базе данных
const pool = new Pool(config.database);

// Проверка подключения к базе данных
pool.connect()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Хранилище для временных кодов подтверждения
const verificationCodes = new Map<string, VerificationData>();

// Обработка команды /start
bot.command('start', async (ctx) => {
  const startCode = ctx.message.text.split(' ')[1];
  
  if (startCode) {
    // Проверяем существование пользователя с этим кодом верификации
    const result = await pool.query(
      'SELECT id, phone FROM users WHERE phone_verification_code = $1',
      [startCode]
    );

    if (result.rows.length === 0) {
      await ctx.reply('❌ Неверный код верификации. Пожалуйста, перейдите по ссылке с сайта.');
      return;
    }

    const user = result.rows[0];
    
    // Сохраняем код верификации для этого пользователя
    verificationCodes.set(ctx.from.id.toString(), {
      code: startCode,
      userId: user.id,
      expires: Date.now() + 5 * 60 * 1000 // 5 минут
    });

    // Создаем клавиатуру с кнопкой отправки контакта
    const keyboard = Markup.keyboard([
      [Markup.button.contactRequest('📱 Отправить номер телефона')]
    ]).resize();

    await ctx.reply(
      'Добро пожаловать! Для подтверждения номера телефона, пожалуйста, нажмите на кнопку ниже:',
      keyboard
    );
  } else {
    await ctx.reply(
      'Привет! Я бот для подтверждения номера телефона. ' +
      'Пожалуйста, перейдите по ссылке с сайта для начала процесса подтверждения.'
    );
  }
});

// Обработка получения контакта
bot.on('contact', async (ctx) => {
  const phone = ctx.message.contact.phone_number;
  const userId = ctx.from.id.toString();
  
  // Получаем сохраненный код верификации
  const verificationData = verificationCodes.get(userId);
  
  if (!verificationData) {
    await ctx.reply('❌ Срок действия кода верификации истек. Пожалуйста, перейдите по ссылке с сайта снова.');
    return;
  }

  if (Date.now() > verificationData.expires) {
    verificationCodes.delete(userId);
    await ctx.reply('❌ Срок действия кода верификации истек. Пожалуйста, перейдите по ссылке с сайта снова.');
    return;
  }
  
  // Проверяем существование пользователя с этим кодом верификации
  const result = await pool.query(
    'SELECT id, phone FROM users WHERE phone_verification_code = $1 AND id = $2',
    [verificationData.code, verificationData.userId]
  );

  if (result.rows.length === 0) {
    await ctx.reply('❌ Неверный код верификации. Пожалуйста, перейдите по ссылке с сайта.');
    return;
  }

  const user = result.rows[0];

  // Приводим оба номера к единому формату для сравнения
  function normalizePhone(phone: string) {
    // Удаляем все нецифры, кроме плюса
    let digits = phone.replace(/[^\d+]/g, '');
    // Если начинается с 8, заменяем на +7
    if (digits.startsWith('8')) digits = '+7' + digits.slice(1);
    if (digits.startsWith('7')) digits = '+7' + digits.slice(1);
    if (!digits.startsWith('+7')) digits = '+7' + digits.replace(/^\+?7?/, '');
    return digits;
  }

  const phoneFromTelegram = normalizePhone(phone);
  const phoneFromSite = normalizePhone(user.phone || '');

  if (phoneFromTelegram !== phoneFromSite) {
    await ctx.reply('❌ Номер телефона, который вы отправили, не совпадает с номером, указанным при регистрации на сайте. Пожалуйста, используйте тот же номер.');
    return;
  }

  // Обновляем номер телефона в базе данных
  try {
    await pool.query(
      'UPDATE users SET phone = $1, phone_verified = true, phone_verification_code = NULL WHERE id = $2',
      [phone, user.id]
    );
    
    // Удаляем использованный код
    verificationCodes.delete(userId);
    
    // Удаляем клавиатуру
    await ctx.reply(
      '✅ Номер телефона успешно подтвержден! Теперь вы можете вернуться на сайт.',
      Markup.removeKeyboard()
    );
  } catch (error) {
    console.error('Error updating phone number:', error);
    await ctx.reply(
      '❌ Произошла ошибка при подтверждении номера. Пожалуйста, попробуйте позже.',
      Markup.removeKeyboard()
    );
  }
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  if (text === '📱 Отправить номер телефона') {
    // Создаем клавиатуру с кнопкой отправки контакта
    const keyboard = Markup.keyboard([
      [Markup.button.contactRequest('📱 Отправить номер телефона')]
    ]).resize();

    await ctx.reply(
      'Пожалуйста, нажмите на кнопку ниже, чтобы отправить свой номер телефона:',
      keyboard
    );
  } else {
    await ctx.reply(
      'Пожалуйста, используйте кнопку "📱 Отправить номер телефона" для подтверждения.'
    );
  }
});

// Периодическая очистка устаревших кодов
setInterval(() => {
  cleanupExpiredCodes(verificationCodes);
}, 5 * 60 * 1000); // Каждые 5 минут

// Запуск бота
bot.launch().then(() => {
  console.log('Bot started successfully');
}).catch((error) => {
  console.error('Error starting bot:', error);
});

// Обработка завершения работы
process.once('SIGINT', () => {
  pool.end();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  pool.end();
  bot.stop('SIGTERM');
}); 