module.exports = {
  apps: [{
    name: 'russkii-portal',
    script: './dist/index.cjs',
    cwd: '/var/www/russkii-portal',
    
    // Переменные окружения
    env: {
      NODE_ENV: 'production',
      PORT: 5000
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
  }]
}; 
