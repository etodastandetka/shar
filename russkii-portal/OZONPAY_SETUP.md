# Настройка Ozon Pay

## Шаги настройки

### 1. Настройка в личном кабинете Ozon Банка

1. Зайдите в ЛК Ozon Банка
2. Перейдите в раздел "Магазин" → "Интеграция"
3. Нажмите "Создать токен"
4. Введите название токена и выберите "Самостоятельная интеграция"
5. Укажите URL для уведомлений: `http://your-domain.com/api/ozonpay/webhook`
6. Укажите URL успешной оплаты: `http://your-domain.com/payment/success`
7. Укажите URL неуспешной оплаты: `http://your-domain.com/payment/fail`
8. Подтвердите создание токена с помощью SMS
9. Скопируйте полученные ключи:
   - **AccessKey** (AccessKey)
   - **SecretKey** (SecretKey)
   - **NotificationSecretKey** (NotificationSecretKey)

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта со следующими переменными:

```env
# Ozon Pay API Configuration (обновлено согласно официальной документации)
OZONPAY_ACCESS_KEY=your_access_key_here
OZONPAY_SECRET_KEY=your_secret_key_here
OZONPAY_NOTIFICATION_SECRET_KEY=your_notification_secret_key_here
OZONPAY_API_URL=https://payapi.ozon.ru/v1
OZONPAY_SUCCESS_URL=http://localhost:5000/payment/success
OZONPAY_FAIL_URL=http://localhost:5000/payment/fail
OZONPAY_WEBHOOK_URL=http://localhost:5000/api/ozonpay/webhook
```

### 3. Активация эквайринга

После настройки интеграции необходимо активировать интернет-эквайринг путем проведения одного боевого платежа на сумму от 10 рублей.

### 4. Тестирование

1. Создайте тестовый товар
2. Оформите заказ с оплатой через Ozon Pay
3. Проверьте, что платеж проходит успешно
4. Убедитесь, что webhook корректно обрабатывается

Для тестового режима можно использовать тестовую карту: `4111 1111 1111 1111`, `01/28`, `111`.

## Особенности интеграции

- Все суммы передаются в рублях (не в копейках!)
- Подпись запроса создается согласно официальной документации Ozon Pay
- Webhook должен отвечать статусом 200 для подтверждения получения
- Товары резервируются на 15 минут после создания платежа
- При успешной оплате количество товаров автоматически уменьшается

## Статусы платежей

- `STATUS_PAYMENT_PENDING` - платеж создан, ожидает оплаты
- `Completed` - платеж успешно завершен
- `Failed` - платеж отклонен
- `Cancelled` - платеж отменен

## API Endpoints

### Создание заказа
- **URL**: `https://payapi.ozon.ru/v1/createOrder`
- **Метод**: POST
- **Подпись**: `accessKey + expiresAt + extId + fiscalizationType + paymentAlgorithm + amount.currencyCode + amount.value + secretKey`

### Получение информации о заказе
- **URL**: `https://payapi.ozon.ru/v1/getOrderDetails`
- **Метод**: POST
- **Подпись**: `accessKey + orderId + secretKey`

### Получение статуса заказа
- **URL**: `https://payapi.ozon.ru/v1/getOrderStatus`
- **Метод**: POST
- **Подпись**: `accessKey + orderId + secretKey`

### Webhook подпись
- **Формула**: `SHA256(accessKey|orderID|transactionID|extOrderID|amount|currencyCode|notificationSecretKey)`

## Поддержка

При возникновении проблем с интеграцией обращайтесь в техническую поддержку Ozon Pay. 