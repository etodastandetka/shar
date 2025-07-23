# Руководство по настройке Ozon Pay

## 📋 Пошаговая настройка (по инструкции техподдержки Ozon Pay)

### 1. Настройка в ЛК Ozon Банка

1. **Зайдите в ЛК Ozon Банка** 
2. **Перейдите в раздел "Магазин" → "Интеграция"**
3. **Нажмите "Создать токен"**
4. **Введите название токена** и выберите **"Самостоятельная интеграция"**
5. **Добавьте URL-адреса:**
   - **URL успешной оплаты:** `https://yourdomain.com/payment/success`
   - **URL неуспешной оплаты:** `https://yourdomain.com/payment/fail`
   - **URL для POST-уведомлений:** `https://yourdomain.com/api/ozonpay/webhook`
6. **Подтвердите создание** с помощью SMS-кода
7. **Скопируйте полученные ключи** из окна "Данные токена":
   - **AccessKey** (ca10c60b-6c30-4e9d-ac21-d52d497ff31f)
   - **SecretKey** (1kZ1ZiPDDxVy0JlWsG4v14EhRIGOTYmK)
   - **NotificationSecretKey** (avUNhUZku6o0FYLtTxwYZrni6ODUgxdN)

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Ozon Pay API Configuration (обновлено согласно официальной документации)
# Замените на реальные данные из ЛК Ozon Банка
OZONPAY_ACCESS_KEY=your_access_key_here
OZONPAY_SECRET_KEY=your_secret_key_here
OZONPAY_NOTIFICATION_SECRET_KEY=your_notification_secret_key_here
OZONPAY_API_URL=https://payapi.ozon.ru/v1
OZONPAY_SUCCESS_URL=https://yourdomain.com/payment/success
OZONPAY_FAIL_URL=https://yourdomain.com/payment/fail
OZONPAY_WEBHOOK_URL=https://yourdomain.com/api/ozonpay/webhook

# Другие настройки
DATABASE_URL=sqlite:./db/database.sqlite
JWT_SECRET=your_jwt_secret_here
PORT=5000
NODE_ENV=development
```

### 3. Активация интернет-эквайринга

⚠️ **ВАЖНО:** После настройки интеграции нужно активировать интернет-эквайринг путём проведения одного боевого платежа на сумму от 10 рублей.

**Как активировать:**
1. Создайте тестовый товар на сумму 10 рублей
2. Проведите тестовую оплату
3. Уведомите техподдержку Ozon Pay о проведении платежа

### 4. Проверка текущей реализации

Наша реализация в `server/ozonpay.ts` обновлена согласно официальной документации:

✅ **Готово:**
- Правильный API URL: `https://payapi.ozon.ru/v1`
- Корректная структура запросов createOrder
- Правильный алгоритм подписи для всех методов
- Корректная обработка webhook'ов
- Правильные названия ключей (AccessKey, SecretKey, NotificationSecretKey)

### 5. Тестирование

После настройки переменных окружения:

1. **Запустите сервер:** `npm run dev`
2. **Создайте тестовый заказ** с оплатой через Ozon Pay
3. **Проверьте логи** на наличие ошибок
4. **Убедитесь в получении webhook'ов**

**Тестовая карта:** `4111 1111 1111 1111`, `01/28`, `111`

### 6. Возможные проблемы и решения

#### Проблема: Ошибка при создании платежа
**Решение:** Проверьте правильность AccessKey, SecretKey и алгоритма подписи

#### Проблема: Webhook не приходят
**Решение:** Убедитесь что URL webhook доступен извне и отвечает статусом 200

#### Проблема: Неверная подпись
**Решение:** Проверьте NotificationSecretKey и алгоритм проверки подписи webhook

### 7. Изменения в API

**Новая структура запроса создания заказа:**
```json
{
  "accessKey": "ca10c60b-6c30-4e9d-ac21-d52d497ff31f",
  "amount": {
    "currencyCode": "643",
    "value": 5500
  },
  "enableFiscalization": false,
  "extId": "45",
  "fiscalizationType": "FISCAL_TYPE_SINGLE",
  "paymentAlgorithm": "PAY_ALGO_SMS",
  "successUrl": "https://mysite.ozon.ru/?good",
  "failUrl": "https://mysite.ozon.ru/?bad",
  "receiptEmail": "email@ozon.ru",
  "notificationUrl": "https://webhook.site/4a30efd7-b1c1-469f-a337-e2fe1411f9f3",
  "requestSign": "c4871a9576a368ae95cb279f2fb6dcfef8884ab6c7af4b0dfceb591cbf835bc3",
  "items": [...]
}
```

**Подпись webhook:**
```
SHA256(accessKey|orderID|transactionID|extOrderID|amount|currencyCode|notificationSecretKey)
```

### 8. Контакты техподдержки

По всем вопросам интеграции обращайтесь к техподдержке Ozon Pay, которая предоставила эти инструкции.

---

## 🚀 Быстрый старт

1. Получите ключи в ЛК Ozon Банка (AccessKey, SecretKey, NotificationSecretKey)
2. Замените значения в `.env` файле  
3. Запустите `npm run dev`
4. Проведите тестовый платеж на 10 рублей
5. Готово! 🎉 