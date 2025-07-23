# 🚀 НАСТРОЙКА ПРОДАКШН OZON PAY

## 📝 Что было исправлено:
1. ✅ Обновлен `server/ozonpay.ts` - теперь читает credentials из переменных окружения
2. ✅ Добавлен шаблон в `ecosystem.config.cjs` для продакшн переменных

## 🔑 ШАГ 1: Получение продакшн ключей
Войдите в **личный кабинет Ozon Pay** и получите:
- `ACCESS_KEY` (продакшн)
- `SECRET_KEY` (продакшн)  
- `NOTIFICATION_SECRET_KEY` (продакшн)

## ⚙️ ШАГ 2: Обновление ecosystem.config.cjs
Откройте файл `ecosystem.config.cjs` и **замените** эти строки:

```javascript
// Ozon Pay продакшн настройки - ЗАМЕНИТЬ НА РЕАЛЬНЫЕ КЛЮЧИ!
OZONPAY_ACCESS_KEY: 'YOUR_PRODUCTION_ACCESS_KEY_HERE',
OZONPAY_SECRET_KEY: 'YOUR_PRODUCTION_SECRET_KEY_HERE', 
OZONPAY_NOTIFICATION_SECRET_KEY: 'YOUR_PRODUCTION_NOTIFICATION_SECRET_HERE',
```

**НА РЕАЛЬНЫЕ КЛЮЧИ:**
```javascript
// Ozon Pay продакшн настройки
OZONPAY_ACCESS_KEY: 'abc123-def456-ghi789-реальный-ключ',
OZONPAY_SECRET_KEY: 'xyz789-uvw456-реальный-секрет', 
OZONPAY_NOTIFICATION_SECRET_KEY: 'qwe123-asd456-реальный-notification',
```

## 🔄 ШАГ 3: Применение изменений

### На сервере выполните:
```bash
# 1. Перейдите в папку проекта
cd /var/www/russkii-portal

# 2. Пересоберите проект (важно - изменился server/ozonpay.ts!)
npm run build

# 3. Перезапустите сервер с новой конфигурацией
pm2 restart russkii-portal

# 4. Проверьте логи
pm2 logs russkii-portal --lines 20
```

## ✅ ШАГ 4: Проверка
После перезапуска создайте тестовый заказ на сайте. В логах должно быть:
- ✅ **Отсутствие ошибок** "не найдено" 
- ✅ **Успешное создание** платежной ссылки
- ✅ **URL оплаты** в ответе API

## 🔍 ШАГ 5: Диагностика (если не работает)
```bash
# Проверить что переменные загрузились
pm2 show russkii-portal

# Посмотреть последние ошибки
pm2 logs russkii-portal --err --lines 10
```

## ⚠️ ВАЖНО:
- **Не коммитьте** реальные ключи в git
- **Сделайте бэкап** ecosystem.config.cjs перед изменениями
- **Тестируйте** с небольшими суммами сначала

## 🆘 Если проблемы:
1. Проверьте правильность ключей в личном кабинете Ozon Pay
2. Убедитесь что ключи **продакшн**, а не тестовые
3. Проверьте что webhook URL доступен: `https://helens-jungle.ru/api/ozonpay/webhook` 