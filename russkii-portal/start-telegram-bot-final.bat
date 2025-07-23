@echo off
echo ========================================
echo 🚀 Запуск улучшенного Telegram бота
echo ========================================
echo.
echo 🔑 Токен бота встроен в код
echo 📱 Функции:
echo    ✅ Верификация номеров телефонов
echo    📦 Уведомления о заказах
echo    🌱 Уведомления о новых товарах  
echo    📋 Просмотр статуса заказов
echo.

cd /d "%~dp0"

echo 📁 Рабочая директория: %CD%
echo.

echo 🔧 Запуск через Node.js...
node start-bot-simple.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Ошибка запуска через Node.js
    echo 🔄 Пробуем альтернативный метод...
    echo.
    npx ts-node server/telegram-bot-final.ts
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Не удалось запустить бота
    echo 🔍 Проверьте:
    echo    1. Установлен ли Node.js
    echo    2. Установлены ли зависимости (npm install)
    echo    3. Правильность токена в коде
    echo.
    pause
) else (
    echo.
    echo ✅ Бот успешно запущен!
)

pause 