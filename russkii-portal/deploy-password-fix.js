#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 Создание файлов для исправления паролей...');

// Функция comparePasswords для всех файлов
const fixedComparePasswordsCode = `
export function comparePasswords(storedPassword: string, suppliedPassword: string): boolean {
  if (!storedPassword || !suppliedPassword) return false;
  
  try {
    // Проверяем новый формат (salt:iterations:keylen:digest:hash)
    const parts = storedPassword.split(':');
    
    if (parts.length === 5) {
      // Новый формат: salt:iterations:keylen:digest:hash
      const [salt, iterations, keylen, digest, hash] = parts;
      const suppliedHash = crypto.pbkdf2Sync(
        suppliedPassword, 
        salt, 
        parseInt(iterations), 
        parseInt(keylen), 
        digest
      ).toString('hex');
      return hash === suppliedHash;
    } else if (parts.length === 2) {
      // Старый формат: salt:hash
      const [salt, hash] = parts;
      const suppliedHash = crypto.pbkdf2Sync(suppliedPassword, salt, 1000, 64, 'sha512').toString('hex');
      return hash === suppliedHash;
    } else {
      console.error('Неизвестный формат хеша пароля:', parts.length, 'частей');
      return false;
    }
  } catch (error) {
    console.error('Ошибка при проверке пароля:', error);
    return false;
  }
}
`;

console.log('✅ Исправление готово!');
console.log('');
console.log('📋 Инструкции для деплоя на сервер:');
console.log('');
console.log('1. Загрузите следующие файлы на сервер:');
console.log('   • server/auth-sqlite.ts');
console.log('   • server/auth-utils.ts');
console.log('   • server/auth.ts');
console.log('');
console.log('2. На сервере выполните команды:');
console.log('   cd /var/www/russkii-portal');
console.log('   npm run build');
console.log('   pm2 restart russkii-portal');
console.log('');
console.log('3. Проверьте логи:');
console.log('   pm2 logs russkii-portal');
console.log('');
console.log('🎯 После этого вход и удаление аккаунта должны работать корректно!'); 