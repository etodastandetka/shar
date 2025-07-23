@echo off
echo 🔐 ИСПРАВЛЕНИЕ ОТКРЫТЫХ ПАРОЛЕЙ И ПЕРЕЗАПУСК СЕРВЕРА
echo.

echo 📦 Сборка сервера с исправленной аутентификацией...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Ошибка при сборке проекта
    pause
    exit /b 1
)

echo.
echo 🔄 Перезапуск сервера с новой логикой...
pm2 restart russkii-portal

echo.
echo 🔐 Исправление открытых паролей в базе данных...
node fix-plain-passwords.cjs

echo.
echo 🔄 Финальный перезапуск сервера...
pm2 restart russkii-portal

echo.
echo ✅ Готово! Проверяем статус серверов:
pm2 status

echo.
echo 🎉 Исправление завершено!
echo 💡 Теперь пароли хешируются правильно
echo 🔐 Вход в систему должен работать
echo.
pause 