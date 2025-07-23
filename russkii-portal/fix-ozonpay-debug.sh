#!/bin/bash

echo "🔧 Диагностика и исправление Ozon Pay"
echo ""

# 1. Проверяем текущие настройки
echo "📋 Текущие настройки Ozon Pay:"
grep OZONPAY_ .env

echo ""
echo "🔧 Исправляем webhook URL..."
sed -i 's|OZONPAY_WEBHOOK_URL=https://helens-jungle.ru/unique-id|OZONPAY_WEBHOOK_URL=https://helens-jungle.ru/api/ozonpay/webhook|' .env

echo ""
echo "✅ Обновленные настройки:"
grep OZONPAY_WEBHOOK_URL .env

echo ""
echo "🔄 Пересобираем проект..."
npm run build

echo ""
echo "♻️ Перезапускаем сервер..."
pm2 restart russkii-portal

echo ""
echo "⏳ Ждем 3 секунды для запуска..."
sleep 3

echo ""
echo "📋 Проверяем статус сервера..."
pm2 status russkii-portal

echo ""
echo "📄 Последние логи:"
pm2 logs russkii-portal --lines 5

echo ""
echo "✅ Готово!"
echo ""
echo "🔗 ОБЯЗАТЕЛЬНО обновите в ЛК Ozon Банка:"
echo "   1. Перейдите: Магазин → Интеграция"
echo "   2. Найдите ваш токен и нажмите 'Редактировать'"
echo "   3. Обновите URL для POST-уведомлений:"
echo "      https://helens-jungle.ru/api/ozonpay/webhook"
echo ""
echo "⚠️  Если ошибка 'недостаточно прав' остается:"
echo "   1. Проведите тестовый платеж на 10+ рублей в ЛК Ozon Банка"
echo "   2. Уведомите техподдержку Ozon Pay для активации эквайринга"
echo "   3. Проверьте правильность ключей API в ЛК" 