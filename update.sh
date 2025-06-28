#!/bin/bash

echo "🚀 RusskiiPortal - Скрипт обновления"
echo "======================================"

# Переходим в директорию проекта
cd /var/www/russkii-portal

echo "🔄 Останавливаем приложение..."
pm2 stop russkii-portal

echo "💾 Создаем бэкап базы данных..."
if [ -f "db/database.sqlite" ]; then
    cp db/database.sqlite db/backup-$(date +%Y%m%d_%H%M%S).sqlite
    echo "✅ Бэкап создан: db/backup-$(date +%Y%m%d_%H%M%S).sqlite"
else
    echo "⚠️ База данных не найдена, создастся новая"
fi

echo "📦 Устанавливаем зависимости..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Зависимости установлены"
else
    echo "❌ Ошибка установки зависимостей"
    exit 1
fi

echo "🔨 Собираем проект..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Проект собран"
else
    echo "❌ Ошибка сборки проекта"
    exit 1
fi

echo "🚀 Запускаем приложение..."
pm2 start russkii-portal

if [ $? -eq 0 ]; then
    echo "✅ Приложение запущено"
else
    echo "❌ Ошибка запуска приложения"
    pm2 logs russkii-portal --lines 10
    exit 1
fi

echo ""
echo "📊 Статус приложения:"
pm2 status

echo ""
echo "✅ Обновление завершено успешно!"
echo "🌐 Проверьте сайт: http://ваш_домен.com" 