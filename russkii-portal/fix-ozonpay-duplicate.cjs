const fs = require('fs');
const path = require('path');

console.log('=== ИСПРАВЛЕНИЕ ПРОБЛЕМЫ ПОВТОРНЫХ ПЛАТЕЖЕЙ OZON PAY ===\n');

// Находим файлы, которые нужно изменить
const filesToFix = [
  'server/routes-sqlite.ts',
  'server/ozonpay.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`📝 Обрабатываем файл: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Исправляем создание extId в routes-sqlite.ts
    if (filePath.includes('routes-sqlite.ts')) {
      // Исправляем основное создание заказа
      if (content.includes('extId: String(order.id)')) {
        content = content.replace(
          /extId: String\(order\.id\)/g,
          'extId: `${orderId}_${Date.now()}`'
        );
        hasChanges = true;
        console.log('  ✅ Исправлен extId для основного создания заказа');
      }
      
      // Исправляем повторную оплату
      if (content.includes('orderId: String(order.id)')) {
        content = content.replace(
          /orderId: String\(order\.id\)/g,
          'orderId: `${order.id}_retry_${Date.now()}`'
        );
        hasChanges = true;
        console.log('  ✅ Исправлен orderId для повторной оплаты');
      }
      
      // Исправляем пополнение баланса
      if (content.includes('orderId: `balance_${user.id}_${Date.now()}`')) {
        console.log('  ✅ Пополнение баланса уже использует уникальный ID');
      }
    }
    
    // Исправляем ozonpay.ts - добавляем больше рандомности в extId
    if (filePath.includes('ozonpay.ts')) {
      if (content.includes('const extId = paymentData.orderId;')) {
        content = content.replace(
          'const extId = paymentData.orderId;',
          'const extId = `${paymentData.orderId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;'
        );
        hasChanges = true;
        console.log('  ✅ Добавлена дополнительная уникальность в extId');
      }
    }
    
    if (hasChanges) {
      // Создаем бэкап
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(`  💾 Создан бэкап: ${backupPath}`);
      
      // Сохраняем изменения
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Файл обновлен: ${filePath}`);
    } else {
      console.log(`  ℹ️ Файл не требует изменений: ${filePath}`);
    }
    
    console.log('');
  } else {
    console.log(`⚠️ Файл не найден: ${filePath}\n`);
  }
});

console.log('=== ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ ===');
console.log('1. 🔄 Перезапустите сервер после изменений');
console.log('2. 🧪 Протестируйте создание нескольких платежей для одного заказа');
console.log('3. 📋 Проверьте логи Ozon Pay на наличие ошибок "недостаточно прав"');
console.log('4. 🔗 Убедитесь что webhook URL исправлен на /api/ozonpay/webhook');
console.log('');
console.log('✅ Исправление завершено!'); 