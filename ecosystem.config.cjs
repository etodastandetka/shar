module.exports = {
  apps: [{
    name: 'russkii-portal',
    script: './dist/index.cjs',
    cwd: '/var/www/russkii-portal',
    
    // Переменные окружения
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      
      // Ozon Pay продакшн настройки - ЗАМЕНИТЬ НА РЕАЛЬНЫЕ КЛЮЧИ!
      OZONPAY_ACCESS_KEY: 'f3c0b7c9-9d17-4aa7-94b2-7106649534c3',
      OZONPAY_SECRET_KEY: 'E6Wpm0o73sr67ZK7z6qvULn77BqG0lvR', 
      OZONPAY_NOTIFICATION_SECRET_KEY: '3UrW32FscjhqAmeJhuq14eZ8hPamZlz8',
      OZONPAY_API_URL: 'https://payapi.ozon.ru/v1',
      OZONPAY_SUCCESS_URL: 'https://helens-jungle.ru/payment/success',
      OZONPAY_FAIL_URL: 'https://helens-jungle.ru/payment/fail',
      OZONPAY_WEBHOOK_URL: 'https://helens-jungle.ru/api/ozonpay/webhook'
    },

    // Настройки процесса
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Логи
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Настройки перезапуска
    restart_delay: 1000,
    max_restarts: 10,
    
    // Graceful shutdown
    kill_timeout: 5000,
    
    // Дополнительные настройки
    node_args: '--max-old-space-size=1024'
  }, {
    name: 'telegram-bot',
    script: './server/telegram-bot-new.cjs',
    cwd: '/var/www/russkii-portal',
    
    // Переменные окружения
    env: {
      NODE_ENV: 'production'
    },

    // Настройки процесса
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    
    // Логи
    error_file: './logs/telegram-bot-err.log',
    out_file: './logs/telegram-bot-out.log',
    log_file: './logs/telegram-bot-combined.log',
    time: true,
    
    // Настройки перезапуска
    restart_delay: 1000,
    max_restarts: 10,
    
    // Graceful shutdown
    kill_timeout: 5000,
    
    // Дополнительные настройки
    node_args: '--max-old-space-size=512'
  }]
}; 
