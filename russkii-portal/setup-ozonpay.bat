@echo off
echo 🔧 Настройка Ozon Pay для RusskiiPortal
echo.

echo 📋 Копирование переменных окружения...
copy env-setup.txt .env >nul 2>&1

if exist .env (
    echo ✅ Файл .env создан успешно
) else (
    echo ❌ Ошибка при создании файла .env
    echo 📝 Создайте файл .env вручную и скопируйте содержимое из env-setup.txt
)

echo.
echo 📊 Обновление базы данных...
node update-ozonpay-fields.cjs

echo.
echo ✅ Настройка Ozon Pay завершена!
echo.
echo 📝 Следующие шаги:
echo 1. Убедитесь что в файле .env указаны правильные ключи Ozon Pay
echo 2. Для production обновите URL-адреса на ваш домен
echo 3. Запустите сервер: npm run dev
echo 4. Протестируйте создание заказа с оплатой через Ozon Pay
echo.
pause 