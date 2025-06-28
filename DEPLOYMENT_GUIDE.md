# 🚀 Инструкция по развертыванию проекта на сервере

## 📋 Подготовка файлов для загрузки

### Файлы, которые НЕ нужно загружать на сервер:
```
node_modules/
dist/
.git/
.env
*.log
.DS_Store
Thumbs.db
db/database.sqlite-shm
db/database.sqlite-wal
```

### Создание архива для загрузки:
1. Удалите папку `node_modules` если есть
2. Удалите папку `dist` если есть
3. Создайте архив со всеми остальными файлами

## 🖥️ Настройка сервера

### 1. Подключение к серверу и создание директории проекта
```bash
# Подключаемся к серверу
ssh your_user@your_server_ip

# Создаем директорию для проекта
sudo mkdir -p /var/www/russkii-portal
sudo chown $USER:$USER /var/www/russkii-portal
cd /var/www/russkii-portal
```

### 2. Загрузка файлов через FileZilla
- Хост: ваш IP сервера
- Пользователь: ваш пользователь
- Порт: 22 (SFTP)
- Удаленная директория: `/var/www/russkii-portal`
- Загрузите все файлы проекта в эту директорию

### 3. Установка Node.js и npm (если не установлены)
```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверяем версии
node --version
npm --version
```

### 4. Установка зависимостей и сборка проекта
```bash
cd /var/www/russkii-portal

# Устанавливаем зависимости
npm install

# Собираем проект
npm run build

# Создаем папки для uploads и receipts
mkdir -p uploads public/receipts
chmod 755 uploads public/receipts
```

### 5. Создание .env файла
```bash
# Создаем файл окружения
nano .env
```

Добавьте в `.env`:
```env
NODE_ENV=production
PORT=5000
SESSION_SECRET=your_super_secret_session_key_here_make_it_long_and_random
DATABASE_URL=./db/database.sqlite

# Telegram Bot (опционально)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
WEBHOOK_URL=https://yourdomain.com/webhook

# Ozon Pay (если используется)
OZON_PAY_API_KEY=your_ozon_pay_key
OZON_PAY_SECRET=your_ozon_pay_secret
```

## 🔧 Настройка Nginx

### 1. Установка Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Создание конфигурации сайта
```bash
sudo nano /etc/nginx/sites-available/russkii-portal
```

Добавьте конфигурацию:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Основная локация для статических файлов
    location / {
        root /var/www/russkii-portal/dist/public;
        try_files $uri $uri/ @proxy;
        index index.html;
        
        # Кэширование статических файлов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Прокси для API и динамического контента
    location @proxy {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API маршруты
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Загруженные файлы
    location /uploads/ {
        root /var/www/russkii-portal;
        expires 1m;
    }

    # Чеки
    location /receipts/ {
        root /var/www/russkii-portal/public;
        expires 1m;
    }

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/x-javascript
        application/xml+rss
        application/javascript
        application/json;
}
```

### 3. Активация конфигурации
```bash
# Создаем символическую ссылку
sudo ln -s /etc/nginx/sites-available/russkii-portal /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl reload nginx
```

## 🔄 Настройка PM2 для автозапуска

### 1. Установка PM2
```bash
sudo npm install -g pm2
```

### 2. Создание конфигурации PM2
```bash
nano ecosystem.config.js
```

Добавьте конфигурацию:
```javascript
module.exports = {
  apps: [{
    name: 'russkii-portal',
    script: './dist/index.cjs',
    cwd: '/var/www/russkii-portal',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3. Запуск и настройка автозапуска
```bash
# Создаем папку для логов
mkdir -p logs

# Запускаем приложение
pm2 start ecosystem.config.js

# Сохраняем конфигурацию PM2
pm2 save

# Настраиваем автозапуск
pm2 startup
# Выполните команду, которую покажет PM2

# Проверяем статус
pm2 status
pm2 logs russkii-portal
```

## 🔒 Настройка SSL (Let's Encrypt)

### 1. Установка Certbot
```bash
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 2. Получение SSL сертификата
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Настройка автообновления
```bash
sudo certbot renew --dry-run
```

## 📊 Управление приложением

### Полезные команды PM2:
```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs russkii-portal

# Перезапуск
pm2 restart russkii-portal

# Остановка
pm2 stop russkii-portal

# Перезагрузка после изменений
pm2 reload russkii-portal

# Мониторинг в реальном времени
pm2 monit
```

### Просмотр логов Nginx:
```bash
# Логи доступа
sudo tail -f /var/log/nginx/access.log

# Логи ошибок
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Обновление проекта

### Скрипт для быстрого обновления:
```bash
nano update.sh
```

Содержимое скрипта:
```bash
#!/bin/bash
cd /var/www/russkii-portal

echo "🔄 Обновление проекта..."

# Останавливаем приложение
pm2 stop russkii-portal

# Создаем бэкап базы данных
cp db/database.sqlite db/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)

# Загружаем новые файлы (через FileZilla или git)
# git pull origin main (если используете git)

# Устанавливаем зависимости
npm install

# Собираем проект
npm run build

# Запускаем приложение
pm2 start russkii-portal

echo "✅ Обновление завершено!"
```

Сделайте скрипт исполняемым:
```bash
chmod +x update.sh
```

## 🛠️ Создание админ-пользователя

После развертывания создайте админ-пользователя:
```bash
node setup-admin.js
```

## 🔍 Проверка работоспособности

1. Откройте в браузере: `http://yourdomain.com`
2. Проверьте API: `http://yourdomain.com/api/health`
3. Проверьте статус PM2: `pm2 status`
4. Проверьте логи: `pm2 logs russkii-portal`

## ❗ Важные моменты

1. **Безопасность**: Обязательно измените `SESSION_SECRET` в .env
2. **База данных**: SQLite файл будет создан автоматически
3. **Uploads**: Папка `uploads` должна быть доступна для записи
4. **Firewall**: Убедитесь что порты 80 и 443 открыты
5. **Мониторинг**: Регулярно проверяйте логи и статус приложения

## 📞 Поддержка

Если возникнут проблемы:
1. Проверьте логи PM2: `pm2 logs`
2. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Проверьте статус сервисов: `sudo systemctl status nginx` 