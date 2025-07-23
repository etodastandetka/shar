const fs = require('fs');
const path = require('path');

const ROUTES_FILE = path.join(__dirname, 'server', 'routes-sqlite.ts');

console.log('🔧 Исправление endpoint check-phone-verification');
console.log('📁 Файл:', ROUTES_FILE);

// Читаем файл
let content = fs.readFileSync(ROUTES_FILE, 'utf8');

// Старый endpoint
const oldEndpoint = `  app.post("/api/auth/check-phone-verification", async (req, res) => {
    try {
      const { phone, verificationToken } = req.body;
      
      console.log(\`📋 Проверка верификации телефона: \${phone} с токеном: \${verificationToken}\`);
      
      if (!phone || !verificationToken) {
        return res.status(400).json({ 
          error: "Отсутствуют обязательные поля: phone, verificationToken" 
        });
      }

      // Проверяем статус верификации
      const isVerified = checkPhoneVerification(phone, verificationToken);
      
      console.log(\`📋 Результат проверки: \${isVerified ? 'ПОДТВЕРЖДЕН' : 'НЕ ПОДТВЕРЖДЕН'}\`);
      
      res.json({ 
        verified: isVerified,
        message: isVerified ? "Телефон подтвержден" : "Телефон не подтвержден"
      });
    } catch (error) {
      console.error("Ошибка при проверке верификации:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });`;

// Новый правильный endpoint
const newEndpoint = `  app.post("/api/auth/check-phone-verification", async (req, res) => {
    try {
      const { phone, verificationToken } = req.body;
      
      console.log(\`📋 Проверка верификации телефона: \${phone} с токеном: \${verificationToken}\`);
      
      if (!phone || !verificationToken) {
        return res.status(400).json({ 
          error: "Отсутствуют обязательные поля: phone, verificationToken" 
        });
      }

      // Проверяем статус верификации в pending_registrations
      const isVerified = checkPhoneVerification(phone, verificationToken);
      
      console.log(\`📋 Результат проверки: \${isVerified ? 'ПОДТВЕРЖДЕН' : 'НЕ ПОДТВЕРЖДЕН'}\`);
      
      if (isVerified) {
        // Телефон подтвержден - создаем пользователя!
        const userData = getPendingRegistrationData(phone, verificationToken);
        
        if (!userData) {
          return res.status(500).json({ 
            error: "Не удалось получить данные пользователя" 
          });
        }

        console.log(\`👤 Создание пользователя: \${userData.email}\`);

        // Проверяем, нет ли уже такого пользователя
        const existingUser = db.queryOne("SELECT * FROM users WHERE email = ?", [userData.email]);
        if (existingUser) {
          console.log(\`⚠️ Пользователь уже существует: \${userData.email}\`);
          
          // Автоматически логиним существующего пользователя
          const user = userRecordToSessionUser(existingUser);
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Ошибка при автоматическом логине:", loginErr);
              return res.json({
                verified: true,
                message: "Телефон подтвержден, но требуется вход в систему",
                user
              });
            }
            
            // Удаляем из pending_registrations
            removePendingRegistration(phone, verificationToken);
            
            res.json({
              verified: true,
              message: "Телефон подтвержден, добро пожаловать!",
              user,
              autoLogin: true
            });
          });
          return;
        }

        // Создаем нового пользователя
        const userId = crypto.randomUUID();

        try {
          db.run(
            \`INSERT INTO users (
              id, email, password, username, first_name, last_name, phone, address, 
              phone_verified, balance, is_admin, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
            [
              userId,
              userData.email,
              userData.password, // Уже хешированный
              userData.username,
              userData.firstName,
              userData.lastName,
              phone,
              userData.address,
              1, // phone_verified = true
              '0.00',
              0,
              new Date().toISOString(),
              new Date().toISOString()
            ]
          );

          console.log(\`✅ Пользователь создан: \${userData.email} (ID: \${userId})\`);

          // Получаем созданного пользователя
          const newUser = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]);
          if (!newUser) {
            return res.status(500).json({ error: "Ошибка при создании пользователя" });
          }

          // Автоматически логиним
          const user = userRecordToSessionUser(newUser);
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Ошибка при автоматическом логине:", loginErr);
              return res.json({
                verified: true,
                message: "Регистрация успешна, но требуется вход в систему",
                user
              });
            }
            
            // Удаляем из pending_registrations
            removePendingRegistration(phone, verificationToken);
            
            console.log(\`🎉 Автоматический логин: \${userData.email}\`);
            
            res.json({
              verified: true,
              message: "Регистрация завершена успешно!",
              user,
              autoLogin: true
            });
          });

        } catch (dbError) {
          console.error("Ошибка создания пользователя в БД:", dbError);
          res.status(500).json({ error: "Ошибка при создании пользователя" });
        }
      } else {
        res.json({ 
          verified: false,
          message: "Телефон не подтвержден"
        });
      }
    } catch (error) {
      console.error("Ошибка при проверке верификации:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });`;

// Заменяем старый endpoint на новый
const newContent = content.replace(oldEndpoint, newEndpoint);

if (newContent === content) {
  console.error('❌ Не удалось найти старый endpoint для замены');
  console.log('💡 Возможно, он уже был изменен или отличается от ожидаемого');
  process.exit(1);
}

// Записываем обратно
fs.writeFileSync(ROUTES_FILE, newContent);

console.log('✅ Endpoint check-phone-verification исправлен!');
console.log('🎯 Теперь он будет:');
console.log('   1. Проверять подтверждение в pending_registrations');
console.log('   2. Создавать пользователя в users');
console.log('   3. Автоматически логинить');
console.log('   4. Удалять из pending_registrations');
console.log('\n🔄 Перезапустите сервер для применения изменений!'); 