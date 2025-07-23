# 🚀 Развертывание RusskiiPortal на сервере

## 📁 Подготовка файлов для загрузки

### ❌ Файлы, которые НЕ загружать на сервер:
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

### ✅ Что делать перед загрузкой:
1. Удалить папку `node_modules`
2. Удалить папку `dist` 
3. Создать архив со всеми остальными файлами

## 🖥️ Настройка на сервере

### 1. Создание директории проекта
```bash
sudo mkdir -p /var/www/russkii-portal
sudo chown $USER:$USER /var/www/russkii-portal
cd /var/www/russkii-portal
```

### 2. FileZilla - настройки подключения
- **Хост:** ваш IP сервера
- **Пользователь:** ваш пользователь
- **Порт:** 22 (SFTP)
- **Удаленная папка:** `/var/www/russkii-portal`

### 3. Установка Node.js
```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверяем
node --version
npm --version
```

### 4. Сборка проекта
```bash
cd /var/www/russkii-portal

# Устанавливаем зависимости
npm install

# Собираем проект
npm run build

# Создаем нужные папки
mkdir -p uploads public/receipts db logs
chmod 755 uploads public/receipts
```

### 5. Создание .env файла
```bash
nano .env
```

Содержимое:
```env
NODE_ENV=production
PORT=5000
SESSION_SECRET=замените_на_длинный_случайный_ключ_минимум_32_символа
DATABASE_URL=./db/database.sqlite

# Telegram Bot (если нужен)
TELEGRAM_BOT_TOKEN=ваш_токен_бота
WEBHOOK_URL=https://yourdomain.com/webhook

# OzonPay (если используется)
OZON_PAY_API_KEY=ваш_ключ
OZON_PAY_SECRET=ваш_секрет
```

## 🌐 Настройка Nginx

### 1. Установка Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Конфигурация сайта
```bash
sudo nano /etc/nginx/sites-available/russkii-portal
```

Конфигурация:
```nginx
server {
    listen 80;
    server_name ваш_домен.com www.ваш_домен.com;

    # Статические файлы (фронтенд)
    location / {
        root /var/www/russkii-portal/dist/public;
        try_files $uri $uri/ @proxy;
        index index.html;
    }

    # Если файл не найден - отправляем на Node.js
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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Загруженные изображения
    location /uploads/ {
        root /var/www/russkii-portal;
        expires 1d;
    }

    # Чеки
    location /receipts/ {
        root /var/www/russkii-portal/public;
        expires 1h;
    }

    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        root /var/www/russkii-portal/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

### 3. Активация конфигурации
```bash
# Создаем ссылку
sudo ln -s /etc/nginx/sites-available/russkii-portal /etc/nginx/sites-enabled/

# Удаляем дефолтный сайт
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl reload nginx
```

## ⚡ Настройка PM2 (автозапуск)

### 1. Установка PM2
```bash
sudo npm install -g pm2
```

### 2. Конфигурация PM2
```bash
nano ecosystem.config.js
```

Содержимое:
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
    log_file: './logs/combined.log'
  }]
};
```

### 3. Запуск приложения
```bash
# Запускаем
pm2 start ecosystem.config.js

# Сохраняем конфигурацию
pm2 save

# Настраиваем автозапуск при перезагрузке сервера
pm2 startup
# Выполните команду, которую покажет PM2

# Проверяем статус
pm2 status
```

## 🔒 SSL сертификат (Let's Encrypt)

### 1. Установка Certbot
```bash
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 2. Получение сертификата
```bash
sudo certbot --nginx -d ваш_домен.com -d www.ваш_домен.com
```

## 🛠️ Первоначальная настройка

### Создание админ-пользователя
```bash
cd /var/www/russkii-portal
node setup-admin.js
```

## 📊 Полезные команды

### PM2 команды:
```bash
pm2 status              # Статус приложений
pm2 logs russkii-portal # Просмотр логов
pm2 restart russkii-portal # Перезапуск
pm2 stop russkii-portal    # Остановка
pm2 monit               # Мониторинг в реальном времени
```

### Nginx команды:
```bash
sudo nginx -t                    # Проверка конфигурации
sudo systemctl reload nginx     # Перезагрузка конфигурации
sudo systemctl status nginx     # Статус сервиса
sudo tail -f /var/log/nginx/error.log # Просмотр ошибок
```

## 🔄 Обновление проекта

### Скрипт обновления
```bash
nano update.sh
```

Содержимое:
```bash
#!/bin/bash
cd /var/www/russkii-portal

echo "🔄 Останавливаем приложение..."
pm2 stop russkii-portal

echo "💾 Создаем бэкап БД..."
cp db/database.sqlite db/backup-$(date +%Y%m%d_%H%M%S).sqlite

echo "📦 Устанавливаем зависимости..."
npm install

echo "🔨 Собираем проект..."
npm run build

echo "🚀 Запускаем приложение..."
pm2 start russkii-portal

echo "✅ Обновление завершено!"
pm2 status
```

Сделать исполняемым:
```bash
chmod +x update.sh
```

## 🔍 Проверка работы

1. **Сайт:** `http://ваш_домен.com`
2. **API:** `http://ваш_домен.com/api/health` 
3. **Статус:** `pm2 status`
4. **Логи:** `pm2 logs russkii-portal`

## ⚠️ Важно!

1. **Замените** `SESSION_SECRET` на случайную строку
2. **Откройте порты** 80 и 443 в файрволе
3. **Регулярно проверяйте** логи и статус
4. **Делайте бэкапы** базы данных

## 🆘 Если что-то не работает

```bash
# Проверьте логи PM2
pm2 logs russkii-portal

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/error.log

# Проверьте статус сервисов
sudo systemctl status nginx
pm2 status

# Перезапустите всё
pm2 restart russkii-portal
sudo systemctl reload nginx
``` 