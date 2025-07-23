const fs = require('fs');
const path = require('path');

console.log('🔧 ПОЛНОЕ ИСПРАВЛЕНИЕ АРХИТЕКТУРЫ РЕГИСТРАЦИИ');

// 1. Исправляем серверную логику
const routesPath = 'server/routes-sqlite.ts';

console.log('1️⃣ Исправляем серверные endpoints...');

// Читаем файл
let routesContent = fs.readFileSync(routesPath, 'utf8');

// Заменяем endpoint register
const oldRegister = /\/\/ Регистрация пользователя[\s\S]*?\/\/ Проверяем существующего пользователя[\s\S]*?res\.json\(\{[\s\S]*?\}\);[\s\S]*?\}\);[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\);[\s\S]*?\}\);/;

const newRegister = `// ИСПРАВЛЕННАЯ регистрация пользователя - только в pending_registrations
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, username, phone, address } = req.body;
      
      // Валидация данных
      if (!email || !password || !firstName || !lastName || !phone) {
        return res.status(400).json({ 
          message: "Заполните все обязательные поля",
          errors: { 
            email: !email ? "Email обязателен" : null,
            password: !password ? "Пароль обязателен" : null,
            firstName: !firstName ? "Имя обязательно" : null,
            lastName: !lastName ? "Фамилия обязательна" : null,
            phone: !phone ? "Телефон обязателен" : null
          }
        });
      }

      // Проверяем пароль
      if (password.length < 8) {
        return res.status(400).json({ 
          message: "Пароль должен быть не менее 8 символов",
          errors: { password: "Пароль должен быть не менее 8 символов" }
        });
      }

      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ 
          message: "Пароль должен содержать заглавную букву",
          errors: { password: "Пароль должен содержать хотя бы одну заглавную букву" }
        });
      }
      
      if (!/[0-9]/.test(password)) {
        return res.status(400).json({ 
          message: "Пароль должен содержать цифру",
          errors: { password: "Пароль должен содержать хотя бы одну цифру" }
        });
      }

      // Проверяем существующего пользователя в users
      const existingUser = db.queryOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
      if (existingUser) {
        return res.status(400).json({
          message: "Пользователь с таким email уже существует",
          errors: { email: "Пользователь с таким email уже существует" }
        });
      }

      // Генерируем токен верификации
      const verificationToken = crypto.randomBytes(16).toString('hex');

      // Подготавливаем данные пользователя
      const userData = {
        email: email.toLowerCase(),
        password: hashPassword(password), // Хешируем пароль сразу
        firstName,
        lastName,
        username: username || email.split('@')[0],
        phone,
        address: address || ''
      };

      // Сохраняем ТОЛЬКО в pending_registrations (НЕ в users!)
      const success = savePendingRegistration(phone, userData, verificationToken);
      
      if (!success) {
        return res.status(500).json({
          message: "Ошибка сохранения данных регистрации"
        });
      }

      console.log(\`📝 Новая регистрация (ИСПРАВЛЕННАЯ ЛОГИКА):\`);
      console.log(\`   Email: \${email}\`);
      console.log(\`   Телефон: \${phone}\`);
      console.log(\`   Токен: \${verificationToken}\`);

      // Возвращаем токен для подтверждения
      res.json({
        message: "Данные сохранены. Подтвердите номер телефона.",
        verificationToken,
        phone,
        needsPhoneVerification: true
      });

    } catch (error) {
      console.error("Ошибка при сохранении регистрации:", error);
      res.status(500).json({ 
        message: "Внутренняя ошибка сервера",
        error: error instanceof Error ? error.message : "Неизвестная ошибка"
      });
    }
  });`;

// Применяем замену
if (routesContent.includes('app.post("/api/auth/register"')) {
  routesContent = routesContent.replace(
    /app\.post\("\/api\/auth\/register"[\s\S]*?\}\);/,
    newRegister
  );
  console.log('✅ Endpoint /api/auth/register исправлен');
} else {
  console.log('❌ Не найден endpoint /api/auth/register');
}

// 2. Добавляем недостающие функции в phone-verification.ts
const phoneVerificationPath = 'server/phone-verification.ts';
let phoneContent = fs.readFileSync(phoneVerificationPath, 'utf8');

// Добавляем новые функции если их нет
if (!phoneContent.includes('getPendingRegistrationData')) {
  const newFunctions = `
// Получить данные пользователя из pending_registrations
export function getPendingRegistrationData(phoneNumber: string, verificationToken: string): any | null {
  try {
    // Нормализуем номер телефона
    let normalizedPhone = phoneNumber.replace(/[^\\d+]/g, '');
    if (normalizedPhone.startsWith('8')) {
      normalizedPhone = '+7' + normalizedPhone.slice(1);
    }
    if (normalizedPhone.startsWith('7') && !normalizedPhone.startsWith('+7')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 11 && normalizedPhone.startsWith('7')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 10) {
      normalizedPhone = '+7' + normalizedPhone;
    }

    const pending = db.queryOne(
      'SELECT * FROM pending_registrations WHERE phone = ? AND verification_token = ? AND verified = 1',
      [normalizedPhone, verificationToken]
    );

    if (pending && pending.user_data) {
      try {
        return JSON.parse(pending.user_data);
      } catch (parseError) {
        console.error('Ошибка парсинга user_data:', parseError);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Ошибка получения данных pending registration:', error);
    return null;
  }
}

// Удалить запись из pending_registrations
export function removePendingRegistration(phoneNumber: string, verificationToken: string): boolean {
  try {
    // Нормализуем номер телефона
    let normalizedPhone = phoneNumber.replace(/[^\\d+]/g, '');
    if (normalizedPhone.startsWith('8')) {
      normalizedPhone = '+7' + normalizedPhone.slice(1);
    }
    if (normalizedPhone.startsWith('7') && !normalizedPhone.startsWith('+7')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 11 && normalizedPhone.startsWith('7')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+') && normalizedPhone.length === 10) {
      normalizedPhone = '+7' + normalizedPhone;
    }

    const result = db.run(
      'DELETE FROM pending_registrations WHERE phone = ? AND verification_token = ?',
      [normalizedPhone, verificationToken]
    );

    console.log(\`🗑️ Удалено записей из pending_registrations: \${result.changes}\`);
    return result.changes > 0;
  } catch (error) {
    console.error('Ошибка удаления pending registration:', error);
    return false;
  }
}`;

  phoneContent += newFunctions;
  console.log('✅ Добавлены новые функции в phone-verification.ts');
}

// 3. Исправляем check-phone-verification endpoint
if (routesContent.includes('app.post("/api/auth/check-phone-verification"')) {
  const newCheckEndpoint = `app.post("/api/auth/check-phone-verification", async (req, res) => {
    try {
      const { phone, verificationToken } = req.body;
      
      console.log(\`📋 Проверка верификации (ИСПРАВЛЕННАЯ ЛОГИКА): \${phone} с токеном: \${verificationToken}\`);
      
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
  });`;

  routesContent = routesContent.replace(
    /app\.post\("\/api\/auth\/check-phone-verification"[\s\S]*?\}\);/,
    newCheckEndpoint
  );
  console.log('✅ Endpoint /api/auth/check-phone-verification исправлен');
}

// Сохраняем файлы
fs.writeFileSync(routesPath, routesContent);
fs.writeFileSync(phoneVerificationPath, phoneContent);

console.log('🎉 АРХИТЕКТУРА ИСПРАВЛЕНА!');
console.log('');
console.log('📋 Что было исправлено:');
console.log('   ✅ Endpoint /api/auth/register - теперь только сохраняет в pending_registrations');
console.log('   ✅ Endpoint /api/auth/check-phone-verification - создает пользователя ПОСЛЕ подтверждения');
console.log('   ✅ Добавлены функции getPendingRegistrationData и removePendingRegistration');
console.log('   ✅ Telegram бот уже исправлен');
console.log('');
console.log('🚀 Теперь запустите: npm run build && pm2 restart all'); 