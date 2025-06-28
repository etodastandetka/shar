import express from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import crypto from "crypto";
import { z } from "zod";
import { db } from "./db-sqlite";
import { 
  savePendingRegistration, 
  checkPhoneVerification, 
  getPendingRegistrationData, 
  removePendingRegistration 
} from "./phone-verification";

// Типы для пользователя
export type UserRecord = {
  id: string;
  email: string;
  password: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  is_admin: number;
  balance: string | null;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  balance: string;
  password: string;
  socialType: null;
  createdAt: Date | null;
  phone: string;
  address: string;
  username: string;
};

// Кэш администраторов
const adminCache = new Set<string>();

// Хэширование пароля
export function hashPassword(password: string): string {
  const saltRounds = 10;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Проверка пароля
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

// Схемы валидации
const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Пароль обязателен")
});

const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  username: z.string().optional(),
  phone: z.string().min(1, "Телефон обязателен"),
  address: z.string().optional()
});

// Расширяем типы Express
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      phone: string;
      address: string;
      username: string;
      isAdmin: boolean;
      balance: string;
      [key: string]: any;
    }
  }
}

// Преобразование записи БД в пользователя сессии
export function userRecordToSessionUser(dbUser: UserRecord): Express.User {
  // Извлекаем firstName и lastName из full_name
  const fullNameParts = (dbUser.full_name || '').split(' ');
  const firstName = fullNameParts[0] || '';
  const lastName = fullNameParts.slice(1).join(' ') || '';
  
  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.full_name || '',
    firstName: firstName,
    lastName: lastName,
    phone: dbUser.phone || '',
    address: dbUser.address || '',
    username: dbUser.username || '',
    isAdmin: Boolean(dbUser.is_admin),
    balance: dbUser.balance || '0.00',
    password: dbUser.password,
    socialType: null,
    createdAt: dbUser.created_at ? new Date(dbUser.created_at) : null
  };
}

// Настройка аутентификации
export function setupAuth(app: express.Application) {
  // Настройка сессий
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      httpOnly: true
    }
  }));

  // Инициализация Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Локальная стратегия аутентификации
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    (email, password, done) => {
      try {
        console.log(`🔐 Попытка входа: ${email} с паролем: ${password.substring(0, 3)}...`);
        const user = db.queryOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]) as UserRecord;
        
        if (!user) {
          console.log(`❌ Пользователь НЕ НАЙДЕН: ${email}`);
          return done(null, false, { message: "Пользователь не найден" });
        }
        
        console.log(`👤 Пользователь найден: ${user.email}, хеш пароля: ${user.password.substring(0, 10)}...`);

        if (!comparePasswords(user.password, password)) {
          console.log(`❌ НЕВЕРНЫЙ ПАРОЛЬ для ${email}`);
          return done(null, false, { message: "Неверный пароль" });
        }

        console.log(`✅ Вход успешен для ${email}`);
        const sessionUser = userRecordToSessionUser(user);
        return done(null, sessionUser);
      } catch (error) {
        console.error(`💥 Ошибка входа:`, error);
        return done(error);
      }
    }
  ));

  // Сериализация пользователя для сессии
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Десериализация пользователя из сессии
  passport.deserializeUser((id: string, done) => {
    try {
      const user = db.queryOne("SELECT * FROM users WHERE id = ?", [id]) as UserRecord;
      if (user) {
        const sessionUser = userRecordToSessionUser(user);
        done(null, sessionUser);
      } else {
        done(null, null);
      }
    } catch (error) {
      done(error, null);
    }
  });

  // ENDPOINT'Ы РЕГИСТРАЦИИ УДАЛЕНЫ - теперь они только в routes-sqlite.ts
  // Оставляем только login endpoint

  app.post("/api/auth/login", (req, res, next) => {
    try {
      // Предварительная валидация
      loginSchema.parse(req.body);
      
      passport.authenticate("local", (err: any, user: Express.User, info: any) => {
        if (err) {
          console.error("Ошибка аутентификации:", err);
          return res.status(500).json({ 
            message: "Ошибка авторизации" 
          });
        }

        if (!user) {
          return res.status(401).json({ 
            message: "Неверный email или пароль",
            field: info?.field || "credentials"
          });
        }

        req.login(user, (err) => {
          if (err) {
            console.error("Ошибка входа:", err);
            return res.status(500).json({ 
              message: "Ошибка при входе в систему" 
            });
          }

          // Обновление данных пользователя
          const userRecord = db.queryOne("SELECT * FROM users WHERE id = ?", [user.id]) as UserRecord | null;
          if (!userRecord) {
            return res.status(500).json({ message: "Ошибка получения данных пользователя" });
          }
          const fullUser = userRecordToSessionUser(userRecord);
          Object.assign(user, fullUser);
          
          return res.json({ 
            message: "Вход выполнен успешно", 
            user: {
              id: fullUser.id,
              email: fullUser.email,
              firstName: fullUser.firstName,
              lastName: fullUser.lastName,
              isAdmin: fullUser.isAdmin,
              balance: fullUser.balance
            }
          });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      console.error("Ошибка входа:", error);
      return res.status(500).json({ 
        message: "Внутренняя ошибка сервера" 
      });
    }
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    const user = req.user as Express.User;

    if (!user) {
      console.error("[Auth] req.user не определен после isAuthenticated()");
      return res.status(500).json({ message: "Не удалось получить данные пользователя (в сессии)" });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        username: user.username,
        isAdmin: user.isAdmin,
        balance: user.balance
      },
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Ошибка при выходе из системы" });
      }
      res.json({ message: "Успешный выход" });
    });
  });
}

// Функция обновления сессии пользователя
export function updateUserSession(req: express.Request) {
  if (!req.isAuthenticated() || !req.user) {
    return Promise.resolve();
  }

  const user = req.user as Express.User;
  
  try {
    // Получаем актуальные данные пользователя из БД
    const dbUser = db.queryOne("SELECT * FROM users WHERE id = ?", [user.id]) as UserRecord | null;
    
    if (!dbUser) {
      console.log(`[Auth] Пользователь ${user.id} не найден в базе данных`);
      return Promise.reject(new Error("Пользователь не найден"));
    }
    
    // Сохраняем текущие значения для логирования
    const prevBalance = user.balance;
    const prevIsAdmin = user.isAdmin;
    
    // Полностью обновляем объект пользователя из БД
    const updatedUser = userRecordToSessionUser(dbUser);
    
    // Копируем все поля из обновленного пользователя
    Object.assign(user, {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      phone: updatedUser.phone,
      address: updatedUser.address,
      username: updatedUser.username,
      isAdmin: updatedUser.isAdmin,
      balance: updatedUser.balance,
      socialType: updatedUser.socialType,
      createdAt: updatedUser.createdAt
    });
    
    // Логируем изменения
    if (prevBalance !== user.balance) {
      console.log(`[Auth] Баланс пользователя ${user.id} обновлен: ${prevBalance} → ${user.balance}`);
    }
    if (prevIsAdmin !== user.isAdmin) {
      console.log(`[Auth] Статус администратора пользователя ${user.id} обновлен: ${prevIsAdmin} → ${user.isAdmin}`);
    }
    
    console.log(`[Auth] Сессия пользователя ${user.email} обновлена. Админ: ${user.isAdmin}, Баланс: ${user.balance}`);
    
    // Принудительно сохраняем сессию
    return new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("[Auth] Ошибка при сохранении сессии:", err);
          reject(err);
        } else {
          console.log("[Auth] Сессия успешно сохранена для пользователя:", user.email);
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("[Auth] Ошибка при обновлении сессии пользователя:", error);
    return Promise.reject(error);
  }
}

// Функция регистрации пользователя
export async function registerUser(userData: {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
  phone?: string;
  address?: string;
}): Promise<any> {
  try {
    if (!userData.email) throw new Error('Email обязателен');
    const emailExists = db.queryOne(
      "SELECT * FROM users WHERE email = ?",
      [userData.email.toLowerCase()]
    );
    if (emailExists) throw new Error('Пользователь с таким email уже существует');
    const hashedPassword = hashPassword(userData.password);
    const userId = crypto.randomUUID();
    db.run(
      `INSERT INTO users (
        id, email, password, username, full_name, phone, address, balance, is_admin, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userData.email.toLowerCase(),
        hashedPassword,
        userData.username || userData.email.split('@')[0],
        userData.fullName || '',
        userData.phone || '',
        userData.address || '',
        '0.00',
        0,
        new Date().toISOString()
      ]
    );
    const newUser = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]) as UserRecord;
    if (!newUser) throw new Error('Ошибка при создании пользователя');
    const formattedUser = userRecordToSessionUser(newUser) as User;
    console.log(`Успешно зарегистрирован пользователь: ${userData.email}`);
    return formattedUser;
  } catch (error) {
    console.error('Ошибка регистрации пользователя:', error);
    throw error;
  }
}

// SQL для создания таблицы пользователей
const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  is_admin INTEGER DEFAULT 0,
  balance TEXT DEFAULT '0.00',
  created_at TEXT NOT NULL,
  updated_at TEXT
)`;

// Функция инициализации базы данных
export async function initializeDatabase() {
  try {
    // Создаем таблицу пользователей, если не существует
    db.run(CREATE_USERS_TABLE);

    // Проверяем существование колонки full_name (логика миграции)
    const tableInfo = db.query("PRAGMA table_info(users)");
    const hasFullName = tableInfo.some((col: any) => col.name === 'full_name');
    const hasFirstName = tableInfo.some((col: any) => col.name === 'first_name');
    const hasLastName = tableInfo.some((col: any) => col.name === 'last_name');
    
    if (!hasFullName && (hasFirstName || hasLastName)) {
      // Добавляем full_name
      db.run("ALTER TABLE users ADD COLUMN full_name TEXT;");
      // Переносим данные
      db.run("UPDATE users SET full_name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) WHERE full_name IS NULL;");
      // Создаем новую таблицу без first_name/last_name
      db.run(`CREATE TABLE users_new (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        username TEXT,
        full_name TEXT,
        phone TEXT,
        address TEXT,
        is_admin INTEGER DEFAULT 0,
        balance TEXT DEFAULT '0.00',
        created_at TEXT NOT NULL,
        updated_at TEXT
      );`);
      db.run(`INSERT INTO users_new (id, email, password, username, full_name, phone, address, is_admin, balance, created_at, updated_at)
        SELECT id, email, password, username, full_name, phone, address, is_admin, balance, created_at, updated_at FROM users;`);
      db.run("DROP TABLE users;");
      db.run("ALTER TABLE users_new RENAME TO users;");
    }

    // Проверяем существование админа
    const adminEmail = "fortnite08qwer@gmail.com";
    const existingAdmin = db.queryOne("SELECT * FROM users WHERE email = ?", [adminEmail]);

    if (!existingAdmin) {
        console.log('Создание пользователя-администратора...');
        const adminPassword = "Plmokn09";
        const adminUsername = "admin";
        const adminFullName = "Admin User";
        const adminPhone = "";
        const adminAddress = "";
        const adminBalance = '0.00';
        const now = new Date().toISOString();
        const userId = crypto.randomUUID();
        const hashedPassword = hashPassword(adminPassword);

        db.run(
            `INSERT INTO users (
                id, email, password, username, full_name, phone, address, is_admin, balance, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                adminEmail,
                hashedPassword,
                adminUsername,
                adminFullName,
                adminPhone,
                adminAddress,
                1, // is_admin = 1
                adminBalance,
                now,
                now
            ]
        );
        console.log('Администратор успешно создан:');
        console.log(`Email: ${adminEmail}`);
        console.log(`Пароль: ${adminPassword}`);
    } else {
        console.log(`Администратор с email ${adminEmail} уже существует.`);
    }

    console.log('SQLite database initialized');
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
} 