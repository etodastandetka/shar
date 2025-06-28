# Токен доступа
Для работы с API необходимо использовать AccessKey, SecretKey и NotificationSecretKey, которые можно получить в настройках магазина.

Пример токенов:
```
AccessKey ca10c60b-6c30-4e9d-ac21-d52d497ff31f
SecretKey 1kZ1ZiPDDxVy0JlWsG4v14EhRIGOTYmK 
NotificationSecretKey avUNhUZku6o0FYLtTxwYZrni6ODUgxdN 
```

# Подпись запроса

Для каждого запроса необходимо формировать подпись, используя SHA256 хэш от строки, составленной из определенных параметров.
Подробнее https://docs.ozon.ru/api/acquiring/#tag/RequestSign

Например для CreateOrder получим строку
`accessKey + expiresAt + extId + fiscalizationType + paymentAlgorithm + amount.currencyCode + amount.value`.
`ca10c60b-6c30-4e9d-ac21-d52d497ff31f23FISCAL_TYPE_SINGLEPAY_ALGO_SMS64355001kZ1ZiPDDxVy0JlWsG4v14EhRIGOTYmK`
От нее посчитаем SHA256 hash, это и будет подпись запроса
`c4871a9576a368ae95cb279f2fb6dcfef8884ab6c7af4b0dfceb591cbf835bc3`

```python
import hashlib

input_string = "ca10c60b-6c30-4e9d-ac21-d52d497ff31f" + "" + "23" + "FISCAL_TYPE_SINGLE" + "PAY_ALGO_SMS" + "643" + "5500" + "1kZ1ZiPDDxVy0JlWsG4v14EhRIGOTYmK"
# input_string = "ca10c60b-6c30-4e9d-ac21-d52d497ff31f23FISCAL_TYPE_SINGLEPAY_ALGO_SMS64355001kZ1ZiPDDxVy0JlWsG4v14EhRIGOTYmK"
result = hashlib.sha256(input_string.encode('utf-8')).hexdigest()
# result = "c4871a9576a368ae95cb279f2fb6dcfef8884ab6c7af4b0dfceb591cbf835bc3"
```

```ruby
Digest::SHA256.hexdigest("ca10c60b-6c30-4e9d-ac21-d52d497ff31f" + "" + "23" + "FISCAL_TYPE_SINGLE" + "PAY_ALGO_SMS" + "643" + "5500" + "1kZ1ZiPDDxVy0JlWsG4v14EhRIGOTYmK")

Digest::SHA256.hexdigest("96712056-0e42-4381-a871-b46788480e91" + "1kZ1ZiPDDxVy0JlWsG4v14EhRIGOTYmK")
```

```golang
inputString := "ca10c60b-6c30-4e9d-ac21-d52d497ff31f" + "" + "23" + "FISCAL_TYPE_SINGLE" + "PAY_ALGO_SMS" + "643" + "5500" + "1kZ1ZiPDDxVy0JlWsG4v14EhRIGOTYmK"
hasher := sha256.New()
hasher.Write([]byte(inputString))
result := hex.EncodeToString(hasher.Sum(nil))
```


# Создание заказа

## URL 
https://payapi.ozon.ru/v1/createOrder


## Request
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
    "items": [
        {
            "extId": "8",
            "name": "Мой товар номер 8",
            "needMark": false,
            "price": {
                "currencyCode": "643",
                "value": 5500
            },
            "quantity": 1,
            "type": "TYPE_PRODUCT",
            "unitType": "UNIT_PIECE",
            "vat": "VAT_NONE"
        }
    ]
}
```


## Response
```json
{
    "order": {
        "id": "96712056-0e42-4381-a871-b46788480e91",
        "number": "2",
        "extId": "32",
        "payLink": "https://checkout.ozon.ru/order/ed13e2gr0zr4",
        "remainingAmount": {"currencyCode": "643","value": "5500"},
        "status": "STATUS_PAYMENT_PENDING",
        "paymentAlgorithm": "PAY_ALGO_SMS",
        "fiscalizationType": "FISCAL_TYPE_UNSPECIFIED",
        "items": [
            {
                "extId": "8",
                "id": "49d01bce-5404-4154-808b-0fef76435748",
                "name": "Мой товар номер 8",
                "quantity": 1,
                "needMark": false,
                "unitType": "UNIT_PIECE",
                "type": "TYPE_PRODUCT",
                "vat": "VAT_NONE",
                "price": {"currencyCode": "643","value": "5500"},
                "attributes": {},
                "positions": [
                    {
                        "id": "1796627",
                        "price": {"currencyCode": "643","value": "5500"},
                        "refundType": "TYPE_UNSPECIFIED",
                        "remainingAmount": {"currencyCode": "643","value": "5500"},
                        "markIsMissing": false
                    }
                ]
            }
        ],
        "mode": "MODE_FULL",
        "isTestMode": false
    },
    "extData": {}
}
```


# Оплата заказа 

Оплата доступна по ссылке, которая возвращается в ответе на создание заказа.
Пример:
https://checkout.ozon.ru/order/ed13e2gr0zr4

Для тестового режима можно использовать тестовую карту: `4111 1111 1111 1111`, `01/28`, `111`.


# Получить информацию о заказе

## URL
https://payapi.ozon.ru/v1/getOrderDetails

## Request
```json
{
    "id":"96712056-0e42-4381-a871-b46788480e91",
    "extId":"",
    "accessKey":"ca10c60b-6c30-4e9d-ac21-d52d497ff31f",
    "requestSign":"e5d1424e42515a8d1cee2af515b8786e6a18152ddad289364c3b4b9bc9f28d35"
}
```

## Response
```json
{
    "item": {
        "id": "96712056-0e42-4381-a871-b46788480e91",
        "number": "2",
        "extId": "32",
        "payLink": "https://checkout.ozon.ru/order/ed13e2gr0zr4",
        "remainingAmount": {"currencyCode": "643","value": "5500"},
        "status": "STATUS_PAYMENT_PENDING",
        "paymentAlgorithm": "PAY_ALGO_SMS",
        "fiscalizationType": "FISCAL_TYPE_UNSPECIFIED",
        "items": [
            {
                "extId": "8",
                "id": "49d01bce-5404-4154-808b-0fef76435748",
                "name": "Мой товар номер 8",
                "quantity": 1,
                "needMark": false,
                "unitType": "UNIT_PIECE",
                "type": "TYPE_PRODUCT",
                "vat": "VAT_NONE",
                "price": {"currencyCode": "643","value": "5500"},
                "attributes": {},
                "positions": [
                    {
                        "id": "1796627",
                        "price": {"currencyCode": "643","value": "5500"},
                        "refundType": "TYPE_UNSPECIFIED",
                        "remainingAmount": {"currencyCode": "643","value": "5500"},
                        "markIsMissing": false
                    }
                ]
            }
        ],
        "mode": "MODE_FULL",
        "isTestMode": false
    },
    "extData": {}
}
```


# Получить статус заказа

## URL
https://payapi.ozon.ru/v1/getOrderStatus


## Request
```json
{
    "id":"96712056-0e42-4381-a871-b46788480e91",
    "extId":"",
    "accessKey":"ca10c60b-6c30-4e9d-ac21-d52d497ff31f",
    "requestSign":"e5d1424e42515a8d1cee2af515b8786e6a18152ddad289364c3b4b9bc9f28d35"
}
```

## Response
```json
{
    "id": "96712056-0e42-4381-a871-b46788480e91",
    "extId": "32",
    "originalAmount": {"currencyCode": "643","value": "5500"},
    "remainingAmount": {"currencyCode": "643","value": "5500"},
    "paymentScheme": {"paidWithMoney": "5500","paidWithBonuses": "0"},
    "isTestMode": false,
    "status": "STATUS_PAYMENT_PENDING"
}
```


# Уведомления о произошедших транзакциях (веб-хуки)

При появлении транзакции отправляется http post нотификация по url указанному при создании токена или переданному в заказе (переданный в заказе имеет приоритет).


## Request
```json
{
  "orderID": "6faaed54-27b7-4741-a535-5ad0ad7f33f9",
  "extOrderID": "30",
  "transactionID": 302024,
  "amount": 5400,
  "currencyCode": "643",
  "paymentTime": "2025-02-14 11:02:23",
  "testMode": 1,
  "status": "Completed",
  "operationType": "Payment",
  "extData": null,
  "paymentMethod": "Card",
  "requestSign": "6c829282d6bb0b93bc3cb6ddefb3d7ef709451022a0bf386ef9296fd4d908a37",
  "items": [
    {
      "extID": "8",
      "paidWithBonuses": 0
    }
  ]
}
```

Подпись запроса (requestSign) вычисляется как SHA256 хэш от строки, составленной из AccessKey, orderID, transactionID, extOrderID, amount, currencyCode и NotificationSecretKey.

# Расшифровка подписи
При появлении транзакции отправляется http post нотификация по url указанному при создании токена или переданному в заказе (переданный в заказе имеет приоритет).

NotificationSecretKey avUNhUZku6o0FYLtTxwYZrni6ODUgxdN 

Подпись вычисляется следущим образом:

SHA256("{tokenID}|{orderID}|{transactionID}|{extOrderID}|{amount}|{currencyCode}|{tokenHookCallbackKey}")
где вместо переменных в фигурных скобках подставлены их значения (все переменные разделены символом |)

tokenID = accessKey
orderID, transactionID, extOrderID, amount, currencyCode - соответствующие поля из запроса
tokenHookCallbackKey - секретный ключ токена

{
  "orderID": "c36f2861-1eb6-4dbe-872f-006a4150f14e",
  "extOrderID": "46",
  "transactionID": 302030,
  "amount": 5500,
  "currencyCode": "643",
  "paymentTime": "2025-02-14 12:26:01",
  "testMode": 0,
  "status": "Completed",
  "operationType": "Payment",
  "extData": null,
  "paymentMethod": "Card",
  "requestSign": "ebc22b6236ee75dd6503dbd0a38e8b76363726fe42d742d0cd6c19fe016161dc",
  "items": [
    {
      "extID": "8",
      "paidWithBonuses": 0
    }
  ]
}