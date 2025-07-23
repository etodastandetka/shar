const fs = require('fs');
const path = require('path');

const ROUTES_FILE = path.join(__dirname, 'server', 'routes-sqlite.ts');

console.log('🔧 Добавление исправленного endpoint');

// Новый endpoint - вставим перед закрывающей скобкой функции
const newEndpoint = `
  // ИСПРАВЛЕННЫЙ ENDPOINT - создает пользователя после подтверждения телефона
  app.post("/api/auth/check-phone-verification-new", async (req, res) => {
    try {
      const { phone, verificationToken } = req.body;
      
      console.log(\`📋 Проверка верификации (НОВАЯ ЛОГИКА): \${phone} с токеном: \${verificationToken}\`);
      
      if (!phone || !verificationToken) {
        return res.status(400).json({ 
          error: "Отсутствуют обязательные поля: phone, verificationToken" 
        });
      }

      // Проверяем статус верификации в pending_registrations
      const isVerified = checkPhoneVerification(phone, verificationToken);
      
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
              message: "Добро пожаловать!",
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
              return res.json({
                verified: true,
                message: "Регистрация успешна, но требуется вход в систему",
                user
              });
            }
            
            // Удаляем из pending_registrations
            removePendingRegistration(phone, verificationToken);
            
            console.log(\`🎉 Регистрация завершена: \${userData.email}\`);
            
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
  });

`;

// Читаем файл
let content = fs.readFileSync(ROUTES_FILE, 'utf8');

// Находим место для вставки (перед "return createServer(app);")
const insertPosition = content.lastIndexOf('  // Create HTTP server');

if (insertPosition === -1) {
  console.error('❌ Не найдено место для вставки');
  process.exit(1);
}

// Вставляем новый endpoint
const newContent = content.slice(0, insertPosition) + newEndpoint + '\n  ' + content.slice(insertPosition);

// Записываем обратно
fs.writeFileSync(ROUTES_FILE, newContent);

console.log('✅ Новый endpoint добавлен!');
console.log('📝 Endpoint: /api/auth/check-phone-verification-new');
console.log('🎯 Логика: создает пользователя ТОЛЬКО после подтверждения телефона');
console.log('\n💡 Теперь нужно:');
console.log('   1. Обновить фронтенд для использования нового endpoint');
console.log('   2. Или переименовать старый endpoint и новый сделать основным'); 