@echo off
echo Останавливаем телеграм бота...
taskkill /f /im node.exe 2>nul

echo Удаляем старую сборку...
if exist dist rmdir /s /q dist

echo Собираем проект...
call npm run build

echo Перезапускаем телеграм бота...
start "Telegram Bot" node server/telegram-bot-final.js

echo Готово! Телеграм бот перезапущен с обновленным кодом.
pause 