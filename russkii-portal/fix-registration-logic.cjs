const fs = require('fs');
const path = require('path');

const ROUTES_FILE = path.join(__dirname, 'server', 'routes-sqlite.ts');

console.log('🔧 Добавление нового endpoint регистрации');
console.log('📁 Файл:', ROUTES_FILE);

// Новый endpoint
const newEndpoint = `
  // НОВЫЙ ПРАВИЛЬНЫЙ ENDPOINT РЕГИСТРАЦИИ - только pending_registrations
  app.post("/api/auth/register-new", async (req, res) => {
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

      // Проверяем существующего пользователя в users
      const existingUser = db.queryOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
      if (existingUser) {
        return res.status(400).json({
          message: "Пользователь с таким email уже существует",
          errors: { email: "Пользователь с таким email уже существует" }
        });
      }

      // Проверяем в pending_registrations
      const existingPending = db.queryOne("SELECT * FROM pending_registrations WHERE user_data LIKE ?", [\`%\${email}%\`]);
      if (existingPending) {
        // Удаляем старую запись
        db.run("DELETE FROM pending_registrations WHERE user_data LIKE ?", [\`%\${email}%\`]);
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

      // Сохраняем в pending_registrations
      const success = savePendingRegistration(phone, userData, verificationToken);
      
      if (!success) {
        return res.status(500).json({
          message: "Ошибка сохранения данных регистрации"
        });
      }

      console.log(\`📝 Новая регистрация сохранена:\`);
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
  });
`;

// Читаем файл
let content = fs.readFileSync(ROUTES_FILE, 'utf8');

// Найдем место для вставки (после старого endpoint регистрации)
const insertPosition = content.indexOf('// Маршрут для генерации чека заказа');

if (insertPosition === -1) {
  console.error('❌ Не найдено место для вставки');
  process.exit(1);
}

// Вставляем новый endpoint
const newContent = content.slice(0, insertPosition) + newEndpoint + '\n\n  ' + content.slice(insertPosition);

// Записываем обратно
fs.writeFileSync(ROUTES_FILE, newContent);

console.log('✅ Новый endpoint добавлен!');
console.log('📝 Endpoint: /api/auth/register-new');
console.log('💡 Теперь нужно обновить фронтенд для использования нового endpoint'); 