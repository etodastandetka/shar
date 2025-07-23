#!/bin/bash

echo "🔧 Исправление Ozon Pay Webhook URL..."

# Проверяем текущий webhook URL
echo "📋 Текущий webhook URL в .env:"
grep OZONPAY_WEBHOOK_URL .env || echo "❌ OZONPAY_WEBHOOK_URL не найден"

# Создаем бэкап .env файла
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "💾 Создан бэкап .env файла"

# Исправляем webhook URL
if grep -q "OZONPAY_WEBHOOK_URL" .env; then
    # Заменяем существующую строку
    sed -i 's|OZONPAY_WEBHOOK_URL=.*|OZONPAY_WEBHOOK_URL=https://helens-jungle.ru/api/ozonpay/webhook|' .env
    echo "✅ OZONPAY_WEBHOOK_URL обновлен"
else
    # Добавляем новую строку
    echo "OZONPAY_WEBHOOK_URL=https://helens-jungle.ru/api/ozonpay/webhook" >> .env
    echo "✅ OZONPAY_WEBHOOK_URL добавлен"
fi

# Показываем результат
echo ""
echo "📋 Новые настройки webhook URL:"
grep OZONPAY_WEBHOOK_URL .env

echo ""
echo "🚨 ВАЖНО: Теперь нужно обновить webhook URL в личном кабинете Ozon Bank!"
echo "   1. Войдите в личный кабинет банка"
echo "   2. Найдите настройки интернет-эквайринга"
echo "   3. Установите webhook URL: https://helens-jungle.ru/api/ozonpay/webhook"
echo ""
echo "📞 Также рекомендуется обратиться в техподдержку Ozon Bank:"
echo "   - Сообщить о проблеме 'недостаточно прав'"
echo "   - Попросить проверить активацию API"
echo "   - Убедиться, что интеграция одобрена"
echo ""
echo "💰 Попробуйте сделать тестовый платеж 10+ рублей для активации"

# Перезапускаем сервер для применения изменений
echo ""
echo "🔄 Перезапускаем сервер для применения изменений..."
pm2 restart russkii-portal || echo "❌ Не удалось перезапустить через PM2"

echo "✅ Скрипт завершен!" 