@echo off
echo ===============================================
echo 🔧 ИСПРАВЛЕНИЕ ВСЕХ ПРОБЛЕМ RUSSKII PORTAL
echo ===============================================
echo.

echo 💰 1. Исправление цен в копейках...
node fix-prices-kopeks.cjs
echo.

echo 💳 2. Исправление проблемы повторных платежей Ozon Pay...
node fix-ozonpay-duplicate.cjs
echo.

echo 🔗 3. Исправление webhook URL для Ozon Pay...
if exist .env (
    echo Найден файл .env, обновляем webhook URL...
    powershell -Command "(Get-Content .env) -replace 'OZONPAY_WEBHOOK_URL=.*', 'OZONPAY_WEBHOOK_URL=https://helens-jungle.ru/api/ozonpay/webhook' | Set-Content .env"
    echo ✅ Webhook URL обновлен
) else (
    echo ❌ Файл .env не найден
)
echo.

echo 🏗️ 4. Пересборка проекта...
call npm run build
echo.

echo 🔄 5. Перезапуск сервера...
echo Остановка текущих процессов...
pm2 stop all

echo Запуск основного сервера...
pm2 start ecosystem.config.cjs

echo Запуск Telegram бота...
pm2 start start-telegram-bot.js --name telegram-bot

echo.
echo 📊 Статус процессов:
pm2 list

echo.
echo ===============================================
echo ✅ ВСЕ ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ!
echo ===============================================
echo.
echo 📋 Что исправлено:
echo   • Цены переведены из копеек в рубли
echo   • Исправлена проблема повторных платежей Ozon Pay
echo   • Обновлен webhook URL для Ozon Pay
echo   • Перезапущен сервер и бот
echo.
echo 🧪 Рекомендации для тестирования:
echo   • Попробуйте создать несколько платежей для одного заказа
echo   • Проверьте цены товаров на сайте
echo   • Протестируйте Telegram бота для верификации
echo.
echo 💡 Для просмотра логов: pm2 logs [название-процесса]
echo 🛑 Для остановки: pm2 stop [название-процесса]
echo.

pause 