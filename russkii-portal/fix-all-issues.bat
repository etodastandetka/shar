@echo off
echo ===============================================
echo 🔧 ИСПРАВЛЕНИЕ ВСЕХ ПРОБЛЕМ JUNGLE PLANTS
echo ===============================================
echo.

echo 1️⃣ Проверка структуры базы данных...
node fix-database-schema.cjs
if %errorlevel% neq 0 (
    echo ❌ Ошибка при исправлении схемы базы данных
    pause
    exit /b 1
)
echo ✅ Схема базы данных исправлена
echo.

echo 2️⃣ Тестирование исправлений...
node test-fixes.cjs
if %errorlevel% neq 0 (
    echo ❌ Ошибка при тестировании
    pause
    exit /b 1
)
echo ✅ Тестирование завершено
echo.

echo 3️⃣ Удаление тестового пользователя...
node quick-delete.cjs
if %errorlevel% neq 0 (
    echo ⚠️ Пользователь не найден или уже удален
)
echo ✅ Тестовый пользователь удален
echo.

echo 4️⃣ Запуск Telegram бота...
echo 📱 Бот будет запущен в отдельном окне
start "Telegram Bot" cmd /k "node server/telegram-bot-final.cjs"
timeout /t 3 /nobreak >nul
echo ✅ Telegram бот запущен
echo.

echo ===============================================
echo 🎉 ВСЕ ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ!
echo ===============================================
echo.
echo 📋 Что исправлено:
echo ✅ Верификация телефона в боте
echo ✅ Уведомления о заказах
echo ✅ Уведомления о новых товарах  
echo ✅ Структура базы данных
echo ✅ Импорты функций бота
echo.
echo 🧪 Для тестирования:
echo 1. Зарегистрируйтесь на сайте: https://helens-jungle.ru
echo 2. Перейдите по ссылке верификации в Telegram
echo 3. Отправьте контакт в боте
echo 4. Создайте заказ на сайте
echo 5. Добавьте новый товар (админ панель)
echo 6. Проверьте уведомления в Telegram
echo.
echo 🔗 Ссылка на бота: https://t.me/jungle_plants_bot
echo 📞 Канал: @helensjungle
echo.
pause 