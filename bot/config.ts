import dotenv from 'dotenv';

dotenv.config();

// Проверка наличия необходимых переменных окружения
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

// Конфигурация бота
export const config = {
  token: process.env.TELEGRAM_BOT_TOKEN,
  database: {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'dastan10dz',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'balloons'
  },
  verificationTimeout: 5 * 60 * 1000, // 5 минут в миллисекундах
  adminChatId: process.env.ADMIN_CHAT_ID || '123456789' // ID чата администратора
};

export interface BotConfig {
  token: string;
  database: {
    user: string;
    password: string;
    host: string;
    port: number;
    database: string;
  };
  verificationTimeout: number;
  adminChatId: string;
}

// Проверка обязательных переменных окружения
if (!config.token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env file');
} 