@echo off
echo 🚀 Перезапуск оптимизированного сервера...

echo 📦 Сборка проекта...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Ошибка при сборке проекта
    pause
    exit /b 1
)

echo 🔄 Перезапуск PM2 процессов...
pm2 restart russkii-portal
pm2 restart telegram-bot

echo ⚡ Проверка статуса...
pm2 status

echo ✅ Оптимизированный сервер перезапущен!
echo 💡 Теперь сессии будут создаваться быстрее при регистрации
echo.
echo 📊 Для тестирования скорости выполните:
echo node test-session-speed.js
echo.
pause 