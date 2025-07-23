#!/bin/bash

echo "🔄 Перезапуск Telegram бота с исправлениями..."

# Останавливаем старый процесс
echo "⏹️ Остановка старого процесса..."
pm2 stop telegram-bot 2>/dev/null || echo "Процесс не был запущен"
pm2 delete telegram-bot 2>/dev/null || echo "Процесс не найден"

# Ждем немного
sleep 2

# Запускаем новый процесс
echo "🚀 Запуск обновленного бота..."
pm2 start server/telegram-bot-final.cjs --name telegram-bot --log-date-format="YYYY-MM-DD HH:mm:ss"

# Показываем статус
echo "📊 Статус процессов:"
pm2 status

echo "✅ Telegram бот перезапущен с исправлениями!"
echo "💡 Теперь бот будет обновлять ОБЕ таблицы при верификации" 