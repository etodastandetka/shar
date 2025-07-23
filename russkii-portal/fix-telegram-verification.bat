@echo off
echo 🔧 ИСПРАВЛЕНИЕ TELEGRAM BOT VERIFICATION
echo ================================================

echo 1. Останавливаем старый бот...
taskkill /IM node.exe /F 2>nul
echo ✅ Процессы Node.js остановлены

echo.
echo 2. Создаем резервную копию старого бота...
if exist "server\telegram-bot-final.cjs" (
    copy "server\telegram-bot-final.cjs" "server\telegram-bot-final.cjs.old"
    echo ✅ Резервная копия создана
) else (
    echo ❌ Старый файл не найден
)

echo.
echo 3. Заменяем бот исправленной версией...
copy "telegram-bot-final-fixed.cjs" "server\telegram-bot-final.cjs"
echo ✅ Файл заменен

echo.
echo 4. Запускаем исправленный бот...
cd server
start "Telegram Bot" node telegram-bot-final.cjs
echo ✅ Исправленный бот запущен

echo.
echo 🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!
echo ================================================
echo Теперь попробуйте заново:
echo 1. Зарегистрироваться на сайте
echo 2. Перейти по ссылке в Telegram
echo 3. Отправить контакт в боте
echo 4. Вернуться на сайт и нажать "Я подтвердил номер"

pause 