#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Создание резервной копии базы данных
function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sourceDb = path.join(__dirname, 'database.sqlite');
  const backupDir = path.join(__dirname, 'backups');
  const backupDb = path.join(backupDir, `database_backup_${timestamp}.sqlite`);
  
  try {
    // Создаем папку для бэкапов если её нет
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('📁 Создана папка для резервных копий:', backupDir);
    }
    
    // Проверяем существование базы данных
    if (!fs.existsSync(sourceDb)) {
      console.error('❌ База данных не найдена:', sourceDb);
      return false;
    }
    
    // Создаем резервную копию
    fs.copyFileSync(sourceDb, backupDb);
    
    const stats = fs.statSync(backupDb);
    console.log(`✅ Резервная копия создана:`);
    console.log(`   Файл: ${backupDb}`);
    console.log(`   Размер: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Время: ${new Date().toLocaleString('ru-RU')}`);
    
    // Удаляем старые бэкапы (оставляем только последние 10)
    cleanupOldBackups(backupDir);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка при создании резервной копии:', error);
    return false;
  }
}

// Очистка старых резервных копий
function cleanupOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('database_backup_') && file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // сортируем по времени создания (новые первые)
    
    if (files.length > 10) {
      const filesToDelete = files.slice(10); // удаляем все кроме первых 10
      
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Удален старый бэкап: ${file.name}`);
      });
      
      console.log(`🧹 Очищено ${filesToDelete.length} старых резервных копий`);
    }
  } catch (error) {
    console.error('⚠️ Ошибка при очистке старых бэкапов:', error);
  }
}

// Восстановление из резервной копии
function restoreDatabase(backupFile) {
  const sourceDb = path.join(__dirname, 'database.sqlite');
  
  try {
    if (!fs.existsSync(backupFile)) {
      console.error('❌ Файл резервной копии не найден:', backupFile);
      return false;
    }
    
    // Создаем бэкап текущей базы перед восстановлением
    const currentBackup = path.join(__dirname, 'backups', `current_backup_${Date.now()}.sqlite`);
    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, currentBackup);
      console.log('💾 Создан бэкап текущей базы данных:', currentBackup);
    }
    
    // Восстанавливаем из бэкапа
    fs.copyFileSync(backupFile, sourceDb);
    
    console.log('✅ База данных восстановлена из резервной копии');
    console.log(`   Источник: ${backupFile}`);
    console.log(`   Назначение: ${sourceDb}`);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка при восстановлении базы данных:', error);
    return false;
  }
}

// Список доступных резервных копий
function listBackups() {
  const backupDir = path.join(__dirname, 'backups');
  
  try {
    if (!fs.existsSync(backupDir)) {
      console.log('📂 Папка с резервными копиями не найдена');
      return [];
    }
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('database_backup_') && file.endsWith('.sqlite'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
          created: stats.mtime.toLocaleString('ru-RU')
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    if (files.length === 0) {
      console.log('📂 Резервные копии не найдены');
      return [];
    }
    
    console.log('📋 Доступные резервные копии:');
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
      console.log(`      Размер: ${file.size}`);
      console.log(`      Создан: ${file.created}`);
      console.log('');
    });
    
    return files;
  } catch (error) {
    console.error('❌ Ошибка при получении списка резервных копий:', error);
    return [];
  }
}

// Главная функция
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'backup':
      console.log('🔄 Создание резервной копии базы данных...');
      backupDatabase();
      break;
      
    case 'restore':
      const backupFile = args[1];
      if (!backupFile) {
        console.error('❌ Укажите файл резервной копии для восстановления');
        console.log('Использование: node backup-database.js restore <путь_к_файлу>');
        process.exit(1);
      }
      console.log('🔄 Восстановление базы данных...');
      restoreDatabase(backupFile);
      break;
      
    case 'list':
      listBackups();
      break;
      
    default:
      console.log('📖 Использование:');
      console.log('  node backup-database.js backup     - создать резервную копию');
      console.log('  node backup-database.js restore <файл> - восстановить из резервной копии');
      console.log('  node backup-database.js list       - показать все резервные копии');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { backupDatabase, restoreDatabase, listBackups }; 