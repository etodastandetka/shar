# Решение проблемы с URL для Ozon Pay

## 🔍 Выявленная проблема

Ozon Pay API **не принимает localhost URL** и возвращает ошибку:
```json
{
  "code": 3,
  "message": "проверьте введенные данные",
  "details": [{
    "violations": [{
      "field": "success_url",
      "message": "неверное значение",
      "code": "BAD_USER_INPUT"
    }]
  }]
}
```

## ✅ Решения

### Вариант 1: Использование ngrok (рекомендуется для разработки)

1. **Установите ngrok**:
   ```bash
   # Скачайте с https://ngrok.com/download
   # Или установите через chocolatey:
   choco install ngrok
   ```

2. **Запустите туннель**:
   ```bash
   ngrok http 5000
   ```

3. **Скопируйте публичный URL** (например: `https://abc123.ngrok.io`)

4. **Обновите .env файл**:
   ```env
   OZONPAY_SUCCESS_URL=https://abc123.ngrok.io/payment/success
   OZONPAY_FAIL_URL=https://abc123.ngrok.io/payment/fail
   OZONPAY_WEBHOOK_URL=https://abc123.ngrok.io/api/ozonpay/webhook
   ```

### Вариант 2: Временные placeholder URL

Обновите .env файл:
```env
OZONPAY_SUCCESS_URL=https://example.com/payment/success
OZONPAY_FAIL_URL=https://example.com/payment/fail
OZONPAY_WEBHOOK_URL=https://webhook.site/unique-id
```

⚠️ **Внимание**: При этом варианте webhook'и работать не будут!

### Вариант 3: Публичный домен (для production)

Если у вас есть публичный домен:
```env
OZONPAY_SUCCESS_URL=https://yourdomain.com/payment/success
OZONPAY_FAIL_URL=https://yourdomain.com/payment/fail
OZONPAY_WEBHOOK_URL=https://yourdomain.com/api/ozonpay/webhook
```

## 🚀 Быстрое решение (Вариант 2)

Создайте файл `.env` с временными URL:

```env
# Database
DATABASE_URL=sqlite:./db/database.sqlite

# Server
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_jwt_secret_here_change_this_in_production

# Ozon Pay API Configuration (с временными URL)
OZONPAY_ACCESS_KEY=f3c0b7c9-9d17-4aa7-94b2-7106649534c3
OZONPAY_SECRET_KEY=E6Wpm0o73sr67ZK7z6qvULn77BqG0lvR
OZONPAY_NOTIFICATION_SECRET_KEY=3UrW32FscjhqAmeJhuq14eZ8hPamZlz8
OZONPAY_API_URL=https://payapi.ozon.ru/v1
OZONPAY_SUCCESS_URL=https://example.com/payment/success
OZONPAY_FAIL_URL=https://example.com/payment/fail
OZONPAY_WEBHOOK_URL=https://webhook.site/unique-id

# Telegram Bot Configuration (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Bank Details for Manual Transfers
BANK_NAME=Сбербанк
BANK_ACCOUNT=40817810000000000000
BANK_RECIPIENT=ИП Коваленко Елена Валерьевна
BANK_INN=236001521940
BANK_BIK=044525225
```

## 🧪 Тестирование

После обновления настроек:

1. Перезапустите сервер:
   ```bash
   npm run dev:sqlite
   ```

2. Создайте заказ с оплатой через Ozon Pay

3. Теперь должна создаваться ссылка на оплату!

## ⚠️ Важные моменты

1. **Localhost URL не работают** с Ozon Pay API
2. **Webhook'и работают только с публичными URL** (ngrok или реальный домен)
3. **Для production** обязательно используйте реальный домен
4. **Тестовая карта**: `4111 1111 1111 1111`, `01/28`, `111`

## 🔧 Автоматическая настройка

Можете использовать готовый batch файл:

```batch
@echo off
echo Обновление URL для Ozon Pay...

echo OZONPAY_SUCCESS_URL=https://example.com/payment/success >> .env.tmp
echo OZONPAY_FAIL_URL=https://example.com/payment/fail >> .env.tmp  
echo OZONPAY_WEBHOOK_URL=https://webhook.site/unique-id >> .env.tmp

echo Настройки обновлены!
pause
``` 