import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { db } from "./db-sqlite";
import { Database } from 'better-sqlite3';
import { setupAuth, userRecordToSessionUser, type User, type UserRecord, updateUserSession, fastRegisterWithSession } from "./auth-sqlite";
import { z } from "zod";
import { insertProductSchema, insertOrderSchema, insertReviewSchema, insertNotificationSchema, insertPaymentDetailsSchema } from "@shared/schema";
import PDFDocument from 'pdfkit';
import { createOzonPayAPI } from "./ozonpay";
import { 
  markPhoneAsVerified,
  savePendingRegistration,
  checkPhoneVerification,
  getPendingRegistrationData,
  removePendingRegistration
} from "./phone-verification";
import { handleTelegramUpdate } from "./telegram-bot";

// Определение интерфейсов
interface Product {
  id: number;
  quantity: number;
  name: string;
  price: number;
}

interface PromoCode {
  id: number;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  start_date: string;
  end_date: string;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: number;
  user_id: number;
  items: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  promo_code?: string;
  product_quantities_reduced?: boolean;
  comment?: string;
}

// Helper function for escaping CSV fields (if not already defined)
function escapeCSVField(field: string): string {
  if (!field) return '';
  if (field.includes(';') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Middleware for checking authentication
function ensureAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    // Обновим данные пользователя перед продолжением
    updateUserSession(req);
    
    // Проверяем ID пользователя
    if (req.user && (req.user as any).id) {
      const userId = (req.user as any).id;
      
      // Проверим существование пользователя в базе
      const existingUser = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]);
      
      if (!existingUser) {
        console.error(`Ошибка авторизации: Пользователь с ID ${userId} не найден в базе данных`);
        req.logout(() => {
          res.status(401).json({ message: "Сессия недействительна. Пожалуйста, войдите снова." });
        });
        return;
      }
      
      console.log(`Пользователь ${userId} авторизован успешно. Баланс: ${(req.user as any).balance || '0'}`);
    return next();
  }
    
    console.error("Ошибка авторизации: ID пользователя не определен");
    res.status(401).json({ message: "Ошибка авторизации: ID пользователя не определен" });
    return;
  }
  
  res.status(401).json({ message: "Необходима авторизация" });
}

// Middleware для проверки прав администратора с обновлением сессии
async function ensureAdmin(req: Request, res: Response, next: Function) {
  console.log("Проверка прав администратора:", req.user);
  
  if (!req.isAuthenticated()) {
    console.log("Пользователь не аутентифицирован");
    return res.status(401).json({ message: "Требуется авторизация" });
  }
  
  try {
  // Обновляем данные пользователя перед проверкой
    await updateUserSession(req);
    
    const user = req.user as any;
    
    if (!user) {
      console.log("Пользователь не найден в сессии");
      return res.status(401).json({ message: "Сессия недействительна" });
    }
    
    // Проверяем права администратора
    if (user.isAdmin === true || user.is_admin === 1) {
      console.log(`Права администратора подтверждены для: ${user.email}`);
      return next();
    }
    
    console.log(`Пользователь ${user.email} не имеет прав администратора`);
    return res.status(403).json({ message: "Недостаточно прав доступа" });
    
  } catch (error) {
    console.error("Ошибка при проверке прав администратора:", error);
    return res.status(500).json({ message: "Внутренняя ошибка сервера" });
  }
}

// Кэш для администраторов
const adminCache = new Set<string>();

// Импортируем функции хеширования из auth-sqlite
import { hashPassword, comparePasswords } from "./auth-sqlite";

// Настройка хранилища для загрузки файлов
const fileStorage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    const uploadDir = path.join(process.cwd(), "uploads");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req: any, file: any, cb: any) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Разрешены только изображения"));
    }
  },
});

// Middleware для сохранения статуса администратора
function preserveAdminStatus(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user) {
    const user = req.user as any;
    const userId = user.id;
    
    // Если пользователь уже в кэше админов
    if (adminCache.has(userId)) {
      console.log(`🔒 Восстановление прав админа для пользователя ${userId}`);
      user.isAdmin = true;
      user.is_admin = 1;
    }
    
    // Если пользователь имеет признак админа, добавляем в кэш
    if (user.isAdmin === true || user.is_admin === 1) {
      console.log(`✅ Кэширование прав админа для пользователя ${userId}`);
      adminCache.add(userId);
    }
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up authentication routes
  setupAuth(app);
  
  // Добавляем middleware для сохранения статуса администратора
  app.use(preserveAdminStatus);

  // Ozon Pay webhook endpoint
  app.post("/api/ozonpay/webhook", express.json(), async (req, res) => {
    try {
      const ozonPayAPI = createOzonPayAPI();
      const webhookData = req.body;
      
      console.log('Ozon Pay webhook received:', webhookData);
      
      // Verify webhook signature
      if (!ozonPayAPI.verifyWebhookSignature(webhookData)) {
        console.error('Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      const { orderID, extOrderID, status, transactionID, operationType } = webhookData;
      
      // Check if this is a balance topup or regular order
      const isBalanceTopup = extOrderID && extOrderID.startsWith('balance_');
      
      if (isBalanceTopup) {
        // Handle balance topup
        const topupUpdateResult = db.run(
          `UPDATE balance_topups SET 
           status = ?,
           ozonpay_transaction_id = ?,
           updated_at = datetime('now')
           WHERE ozonpay_payment_id = ?`,
          [
            status === 'Completed' ? 'completed' : status === 'Failed' ? 'failed' : 'pending',
            transactionID || null,
            orderID
          ]
        );
        
        if (topupUpdateResult.changes > 0 && status === 'Completed') {
          // Add amount to user balance
          const topup = db.queryOne(
            "SELECT user_id, amount FROM balance_topups WHERE ozonpay_payment_id = ?",
            [orderID]
          ) as { user_id: string, amount: number } | null;
          
          if (topup) {
            const currentBalance = db.queryOne(
              "SELECT balance FROM users WHERE id = ?",
              [topup.user_id]
            ) as { balance: string } | null;
            
            if (currentBalance) {
              const newBalance = parseFloat(currentBalance.balance || "0") + topup.amount;
              
              db.run(
                `UPDATE users SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [newBalance.toFixed(2), topup.user_id]
              );
              
              console.log(`Balance topped up for user ${topup.user_id}: +${topup.amount} ₽, new balance: ${newBalance.toFixed(2)} ₽`);
            }
          }
        }
        
        console.log(`Balance topup ${extOrderID} payment status updated to: ${status}`);
      } else {
        // Handle regular order
        const updateResult = db.run(
          `UPDATE orders SET 
           ozonpay_payment_status = ?,
           ozonpay_transaction_id = ?,
           payment_status = ?,
           order_status = ?,
           updated_at = datetime('now')
           WHERE ozonpay_payment_id = ?`,
          [
            status,
            transactionID || null,
            status === 'Completed' ? 'completed' : status === 'Failed' ? 'failed' : 'pending',
            status === 'Completed' ? 'processing' : status === 'Failed' ? 'cancelled' : 'pending',
            orderID
          ]
        );
      
        if (updateResult.changes > 0) {
          console.log(`Order ${extOrderID} payment status updated to: ${status}`);
          
          // If payment succeeded, reduce product quantities and send receipt
          if (status === 'Completed') {
            const order = db.queryOne(
              "SELECT * FROM orders WHERE ozonpay_payment_id = ?",
              [orderID]
            ) as any;
            
            if (order) {
              // Reduce product quantities if not already done
              if (!order.product_quantities_reduced) {
                try {
                  const items = JSON.parse(order.items);
                  for (const item of items) {
                    db.run(
                      `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
                      [item.quantity, item.id]
                    );
                  }
                  
                  db.run(
                    `UPDATE orders SET product_quantities_reduced = 1 WHERE id = ?`,
                    [order.id]
                  );
                  
                  console.log(`Product quantities reduced for order ${order.id}`);
                } catch (error) {
                  console.error('Error reducing product quantities:', error);
                }
              }
              
              // Send fiscal receipt via Telegram
              try {
                // Импортируем функцию отправки фискального чека
                const { sendFiscalReceiptToUser } = require('./telegram-bot-final.cjs');
                const items = JSON.parse(order.items);
                
                // Сумма только за товары (без доставки)
                const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
                
                // Данные для фискального чека согласно 54-ФЗ (интернет-магазин)
                const receiptData = {
                  orderId: order.id,
                  items: items,
                  totalAmount: itemsTotal, // Только товары, без доставки
                  deliveryAmount: order.delivery_amount,
                  paymentMethod: order.payment_method,
                  transactionId: transactionID,
                  includeDeliveryInReceipt: false, // Доставка оплачивается при получении
                  companyInfo: {
                    name: "Helen's Jungle", // TODO: Заменить на реальное название из документов
                    inn: "000000000000", // TODO: Заменить на реальный ИНН (получить в налоговой)
                    address: "г. Москва, ул. Примерная, д. 1", // TODO: Заменить на реальный адрес
                    phone: "+7 (000) 000-00-00", // TODO: Заменить на реальный номер
                    email: "info@helens-jungle.ru", // TODO: Заменить на реальный email
                    website: "helens-jungle.ru",
                    taxSystem: "USN" // УСН - без НДС (или изменить на вашу систему)
                  },
                  kassaInfo: {
                    // TODO: Получить при регистрации онлайн-кассы в ФНС
                    registrationNumber: "0000000000000000", // РН ККТ из свидетельства о регистрации
                    fiscalStorageNumber: "0000000000000000"  // Номер ФН из документов кассы
                  },
                  // Данные пользователя для электронной формы чека
                  user: {
                    phone: order.phone,
                    email: userRecord?.email || null
                  }
                };
                
                await sendFiscalReceiptToUser(order.phone, receiptData);
                
                console.log(`✅ Фискальный чек отправлен пользователю ${order.phone}`);
              } catch (receiptError) {
                console.error(`❌ Ошибка отправки фискального чека:`, receiptError);
              }
            }
          }
        }
      }
      
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error('Ozon Pay webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Payment success page
  app.get("/payment/success", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Оплата успешна</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          .info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="success">✅ Оплата прошла успешно!</div>
        <div class="info">
          <p>📧 Чек по заказу отправлен в ваш Telegram!</p>
          <p>Если вы не получили чек в боте, свяжитесь с поддержкой.</p>
        </div>
        <p>Ваш заказ принят в обработку. Мы свяжемся с вами для уточнения деталей доставки.</p>
        <a href="/" class="btn">Вернуться на главную</a>
      </body>
      </html>
    `);
  });

  // Payment failure page
  app.get("/payment/fail", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ошибка оплаты</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
          .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px; }
        </style>
      </head>
      <body>
        <div class="error">❌ Ошибка при оплате</div>
        <p>К сожалению, платеж не был завершен. Вы можете попробовать еще раз или выбрать другой способ оплаты.</p>
        <a href="/profile" class="btn">Мои заказы</a>
        <a href="/" class="btn">Вернуться на главную</a>
      </body>
      </html>
    `);
  });
  
  // Retry payment for existing order
  app.post("/api/orders/:id/retry-payment", ensureAuthenticated, async (req, res) => {
    try {
      const orderId = req.params.id;
      const user = req.user as Express.User;
      
      // Get order
      const order = db.queryOne(
        user.isAdmin 
          ? "SELECT * FROM orders WHERE id = ?"
          : "SELECT * FROM orders WHERE id = ? AND user_id = ?",
        user.isAdmin ? [orderId] : [orderId, user.id]
      ) as any;
      
      if (!order) {
        return res.status(404).json({ message: "Заказ не найден" });
      }
      
      if (order.payment_method !== 'ozonpay') {
        return res.status(400).json({ message: "Повторная оплата доступна только для Ozon Pay" });
      }
      
      if (order.payment_status === 'completed') {
        return res.status(400).json({ message: "Заказ уже оплачен" });
      }
      
      try {
        const ozonPayAPI = createOzonPayAPI();
        
        // Get user email
        const userRecord = db.queryOne("SELECT email FROM users WHERE id = ?", [order.user_id]) as { email: string } | null;
        
        const paymentData = {
          amount: Math.round(order.total_amount * 100), // Включаем доставку, convert to kopecks
          currency: "RUB",
          orderId: `${order.id}_retry_${Date.now()}`,
          description: `Заказ #${order.id} на сайте Helen's Jungle (повторная оплата, включая доставку)`,
          customerEmail: userRecord?.email,
          customerPhone: order.phone
        };

        // Prepare order items for Ozon Pay
        const orderItems = JSON.parse(order.items).map((item: any, index: number) => {
          // Ensure extId is always a string
          const extId = item.id != null ? String(item.id) : `item_${index}`;
          console.log(`OzonPay retry item ${index}: id=${item.id} -> extId="${extId}" (type: ${typeof extId})`);
          
          return {
            extId,
            name: item.name || 'Неизвестный товар',
            price: {
              currencyCode: "643",
              value: Math.round((item.price || 0) * 100) // Convert to kopecks
            },
            quantity: item.quantity,
            type: "TYPE_PRODUCT",
            unitType: "UNIT_PIECE",
            vat: "VAT_NONE",
            needMark: false
          };
        });

        const paymentResponse = await ozonPayAPI.createPayment(paymentData, orderItems);
        
        // Update payment details
        db.run(
          `UPDATE orders SET 
           ozonpay_payment_id = ?,
           ozonpay_payment_url = ?,
           ozonpay_payment_status = 'pending',
           payment_status = 'pending',
           updated_at = datetime('now')
           WHERE id = ?`,
          [paymentResponse.orderId, paymentResponse.paymentUrl, order.id]
        );

        res.json({
          paymentUrl: paymentResponse.paymentUrl,
          paymentId: paymentResponse.orderId
        });
      } catch (error: any) {
        console.error("Ошибка при создании повторного платежа:", error);
        
        // Обработка недоступности Ozon Pay API
        if (error.message === 'OZON_PAY_API_UNAVAILABLE') {
          return res.status(503).json({ 
            message: "⚠️ Платежная система временно недоступна. Попробуйте позже или обратитесь в поддержку.",
            code: "PAYMENT_SERVICE_UNAVAILABLE"
          });
        }
        
        res.status(500).json({ 
          message: "Ошибка при создании ссылки на оплату. Попробуйте позже." 
        });
      }
    } catch (error) {
      console.error("Error retrying payment:", error);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // Top up balance endpoint
  app.post("/api/balance/topup", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const { amount, paymentMethod } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Некорректная сумма" });
      }
      
      if (!paymentMethod || !["ozonpay", "directTransfer"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Выберите способ пополнения" });
      }
      
      if (paymentMethod === "ozonpay") {
        try {
          const ozonPayAPI = createOzonPayAPI();
          
          const paymentData = {
            amount: Math.round(amount * 100), // Convert to kopecks
            currency: "RUB",
            orderId: `balance_${user.id}_${Date.now()}`,
            description: `Пополнение баланса на ${amount} ₽`,
            customerEmail: user.email,
            customerPhone: user.phone
          };

          // Prepare balance topup item for Ozon Pay
          const orderItems = [{
            extId: "balance_topup",
            name: `Пополнение баланса на ${amount} ₽`,
            price: {
              currencyCode: "643",
              value: Math.round(amount * 100) // Convert to kopecks
            },
            quantity: 1,
            type: "TYPE_SERVICE",
            unitType: "UNIT_PIECE",
            vat: "VAT_NONE",
            needMark: false
          }];

          const paymentResponse = await ozonPayAPI.createPayment(paymentData, orderItems);
          
          // Save topup record
          db.run(
            `INSERT INTO balance_topups (user_id, amount, payment_method, ozonpay_payment_id, ozonpay_payment_url, status, created_at)
             VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
            [user.id, amount, paymentMethod, paymentResponse.orderId, paymentResponse.paymentUrl]
          );

          res.json({
            paymentUrl: paymentResponse.paymentUrl,
            paymentId: paymentResponse.orderId
          });
        } catch (error: any) {
          console.error("Ошибка при создании платежа для пополнения:", error);
          
          // Обработка недоступности Ozon Pay API
          if (error.message === 'OZON_PAY_API_UNAVAILABLE') {
            return res.status(503).json({ 
              message: "⚠️ Платежная система временно недоступна. Попробуйте позже или обратитесь в поддержку.",
              code: "PAYMENT_SERVICE_UNAVAILABLE"
            });
          }
          
          res.status(500).json({ message: "Ошибка при создании ссылки на оплату" });
        }
      } else {
        // Direct transfer - create pending topup record
        const result = db.run(
          `INSERT INTO balance_topups (user_id, amount, payment_method, status, created_at)
           VALUES (?, ?, ?, 'pending', datetime('now'))`,
          [user.id, amount, paymentMethod]
        );

        res.json({
          topupId: result.lastInsertRowid,
          message: "Заявка на пополнение создана. Переведите средства по реквизитам и загрузите подтверждение."
        });
      }
    } catch (error) {
      console.error("Error creating balance topup:", error);
      res.status(500).json({ message: "Ошибка при создании заявки на пополнение" });
    }
  });

  // Get balance history
  app.get("/api/balance/history", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      
      // Get topup history
      const topups = db.query(
        `SELECT * FROM balance_topups 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        [user.id]
      );
      
      // Get order history (where balance was used)
      const orders = db.query(
        `SELECT id, total_amount, created_at, order_status 
         FROM orders 
         WHERE user_id = ? AND payment_method = 'balance'
         ORDER BY created_at DESC`,
        [user.id]
      );
      
      res.json({
        topups: topups || [],
        orders: orders || []
      });
    } catch (error) {
      console.error("Error fetching balance history:", error);
      res.status(500).json({ message: "Ошибка при получении истории баланса" });
    }
  });
  
  // Serve static uploads
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  
  // Удаляем статический маршрут для чеков
  // app.use("/receipts", express.static(path.join(process.cwd(), "public", "receipts")));
  
  // Upload image route
  app.post("/api/upload", ensureAdmin, upload.single("image"), (req, res) => {
    try {
      console.log("🔥 UPLOAD: Получен запрос на загрузку изображения");
      console.log("🔥 UPLOAD: User:", req.user ? req.user.id : 'не авторизован');
      console.log("🔥 UPLOAD: File:", req.file ? req.file.filename : 'не загружен');
      
      if (!req.file) {
        console.log("❌ UPLOAD: Изображение не загружено");
        return res.status(400).json({ message: "Изображение не загружено" });
      }
      
      // Создаем URL к загруженному файлу
      const imageUrl = `/uploads/${req.file.filename}`;
      console.log(`✅ UPLOAD: Файл загружен: ${imageUrl}`);
      
      res.json({ 
        message: "Файл успешно загружен", 
        imageUrl: imageUrl,
        file: req.file
      });
    } catch (error) {
      console.error("❌ UPLOAD: Ошибка при загрузке файла:", error);
      res.status(500).json({ message: "Ошибка при загрузке файла" });
    }
  });
  
  // Добавляем новый маршрут для прямой загрузки нескольких изображений
  app.post("/api/upload-images", ensureAdmin, upload.array("images", 10), (req, res) => {
    try {
      console.log("🔥 UPLOAD-IMAGES: Получен запрос на загрузку изображений");
      console.log("🔥 UPLOAD-IMAGES: User:", req.user ? req.user.id : 'не авторизован');
      console.log("🔥 UPLOAD-IMAGES: Files count:", req.files ? req.files.length : 0);
      
      if (!req.files || req.files.length === 0) {
        console.log("❌ UPLOAD-IMAGES: Изображения не загружены");
        return res.status(400).json({ message: "Изображения не загружены" });
      }
      
      // Создаем URL к загруженным файлам
      const imageUrls: string[] = [];
      const files = req.files as Express.Multer.File[];
      
      files.forEach(file => {
        const imageUrl = `/uploads/${file.filename}`;
        imageUrls.push(imageUrl);
        console.log(`✅ UPLOAD-IMAGES: Файл загружен: ${imageUrl}`);
      });
      
      res.json({ 
        message: "Файлы успешно загружены", 
        imageUrls: imageUrls
      });
    } catch (error) {
      console.error("❌ UPLOAD-IMAGES: Ошибка при загрузке файлов:", error);
      res.status(500).json({ message: "Ошибка при загрузке файлов" });
    }
  });
  
  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      console.log("Products API called with filters:", req.query);
      
      // Получаем все товары из базы данных
      const rawProducts = db.query("SELECT * FROM products");
      
      // Преобразуем данные из БД в формат, понятный клиенту
      const products = rawProducts.map(product => formatProductForClient(product));
      
      // Apply filters if specified in query params
      let filteredProducts = products.filter(Boolean); // Удаляем null значения
      
      // Filter by category
      if (req.query.category) {
        filteredProducts = filteredProducts.filter(
          product => product && product.category === req.query.category
        );
      }
      
      // Filter by availability
      if (req.query.available === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.isAvailable && product.quantity > 0
        );
      }
      
      // Filter by preorder status
      if (req.query.preorder === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.isPreorder
        );
      }
      
      // Filter by rare status
      if (req.query.rare === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.isRare
        );
      }
      
      // Filter by search term
      if (req.query.search) {
        const searchTerm = (req.query.search as string).toLowerCase();
        filteredProducts = filteredProducts.filter(
          product => 
            product && (
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
            )
        );
      }
      
      // Filter by price range
      if (req.query.minPrice) {
        const minPrice = parseFloat(req.query.minPrice as string);
        filteredProducts = filteredProducts.filter(
          product => product && product.price >= minPrice
        );
      }
      
      if (req.query.maxPrice) {
        const maxPrice = parseFloat(req.query.maxPrice as string);
        filteredProducts = filteredProducts.filter(
          product => product && product.price <= maxPrice
        );
      }
      
      // Filter by labels (for special filters like "rare", "easy care", "discount")
      if (req.query.labels) {
        const requestedLabels = Array.isArray(req.query.labels) 
          ? req.query.labels 
          : [req.query.labels];
        
        filteredProducts = filteredProducts.filter(product => {
          if (!product || !product.labels) return false;
          
          // Check if product has any of the requested labels
          return requestedLabels.some((label: string) => 
            product.labels.includes(label)
          );
        });
      }

      // Filter by boolean flags (alternative approach for UI filters)
      if (req.query.rare === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.isRare
        );
      }

      if (req.query.easy === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.isEasyToCare
        );
      }

      if (req.query.discount === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.originalPrice && product.originalPrice > product.price
        );
      }

      // Filter by plant size
      if (req.query.plantSize) {
        filteredProducts = filteredProducts.filter(
          product => product && product.plantSize === req.query.plantSize
        );
      }

      // Filter by light level
      if (req.query.lightLevel) {
        filteredProducts = filteredProducts.filter(
          product => product && product.lightLevel === req.query.lightLevel
        );
      }

      // Filter by humidity level
      if (req.query.humidityLevel) {
        filteredProducts = filteredProducts.filter(
          product => product && product.humidityLevel === req.query.humidityLevel
        );
      }

      // Filter by plant type
      if (req.query.plantType) {
        filteredProducts = filteredProducts.filter(
          product => product && product.plantType === req.query.plantType
        );
      }

      // Filter by origin
      if (req.query.origin) {
        filteredProducts = filteredProducts.filter(
          product => product && product.origin === req.query.origin
        );
      }

      // Filter by pet safe
      if (req.query.petSafe === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.isPetSafe
        );
      }

      // Filter by air purifying
      if (req.query.airPurifying === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.isAirPurifying
        );
      }

      // Filter by flowering
      if (req.query.flowering === "true") {
        filteredProducts = filteredProducts.filter(
          product => product && product.isFlowering
        );
      }

      console.log(`Filtered products: ${filteredProducts.length} out of ${products.length} total products`);
      res.json(filteredProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  
  // Get product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      // Проверяем, что ID является числом
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Некорректный ID товара" });
      }
      
      const product = db.queryOne(
        "SELECT * FROM products WHERE id = ?",
        [productId]
      );
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Преобразуем данные для клиента
      const formattedProduct = formatProductForClient(product);
      
      res.json(formattedProduct);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });
  
  // Create new product
  app.post("/api/products", ensureAdmin, async (req, res) => {
    try {
      console.log("Creating product with data:", req.body);
      
      // Валидируем и трансформируем данные
      const productData = req.body;
      
      // Проверка обязательных полей
      if (!productData.name || !productData.price) {
        return res.status(400).json({ 
          message: "Не указаны обязательные поля: название и цена товара" 
        });
      }
      
      // Изображения должны быть массивом строк
      if (!productData.images) {
        productData.images = [];
      } else if (typeof productData.images === 'string') {
        productData.images = [productData.images];
      }
      
      // Проверяем, что все числовые значения преобразованы в числа
      try {
      productData.price = parseFloat(productData.price);
        if (isNaN(productData.price)) {
          return res.status(400).json({ message: "Некорректное значение цены" });
        }
        
      if (productData.originalPrice) {
        productData.originalPrice = parseFloat(productData.originalPrice);
          if (isNaN(productData.originalPrice)) {
            return res.status(400).json({ message: "Некорректное значение исходной цены" });
          }
        }
        
        productData.quantity = parseInt(productData.quantity || "0");
        if (isNaN(productData.quantity)) {
          return res.status(400).json({ message: "Некорректное значение количества" });
        }
        
      if (productData.deliveryCost) {
        productData.deliveryCost = parseFloat(productData.deliveryCost);
          if (isNaN(productData.deliveryCost)) {
            return res.status(400).json({ message: "Некорректное значение стоимости доставки" });
          }
        }
      } catch (error) {
        console.error("Error parsing numeric values:", error);
        return res.status(400).json({ message: "Ошибка при обработке числовых значений" });
      }
      
      // Добавляем флаги (булевы значения)
      productData.isAvailable = productData.isAvailable === true || productData.isAvailable === 'true';
      productData.isPreorder = productData.isPreorder === true || productData.isPreorder === 'true';
      productData.isRare = productData.isRare === true || productData.isRare === 'true';
      productData.isEasyToCare = productData.isEasyToCare === true || productData.isEasyToCare === 'true';
      productData.isPetSafe = productData.isPetSafe === true || productData.isPetSafe === 'true';
      productData.isAirPurifying = productData.isAirPurifying === true || productData.isAirPurifying === 'true';
      productData.isFlowering = productData.isFlowering === true || productData.isFlowering === 'true';
      productData.isHotDeal = productData.isHotDeal === true || productData.isHotDeal === 'true';
      productData.isBestseller = productData.isBestseller === true || productData.isBestseller === 'true';
      productData.isNewArrival = productData.isNewArrival === true || productData.isNewArrival === 'true';
      productData.isLimitedEdition = productData.isLimitedEdition === true || productData.isLimitedEdition === 'true';
      productData.isDiscounted = productData.isDiscounted === true || productData.isDiscounted === 'true';

      // Устанавливаем значения по умолчанию для новых полей
      productData.plantSize = productData.plantSize || 'medium';
      productData.lightLevel = productData.lightLevel || 'moderate';
      productData.humidityLevel = productData.humidityLevel || 'medium';
      productData.plantType = productData.plantType || 'decorative';
      productData.origin = productData.origin || 'tropical';
      
      // Создаем товар
      try {
        // Сначала проверим, что в таблице есть все необходимые столбцы
        try {
          const tableInfo = db.query("PRAGMA table_info(products)");
          const columns = tableInfo.map((col: any) => col.name);
          const requiredColumns = [
            'name', 'description', 'price', 'original_price', 'images', 'quantity', 
            'category', 'is_available', 'is_preorder', 'is_rare', 'is_easy_to_care',
            'labels', 'delivery_cost'
          ];
          
          const missingColumns = requiredColumns.filter(col => !columns.includes(col));
          
          if (missingColumns.length > 0) {
            console.error(`В таблице products отсутствуют столбцы: ${missingColumns.join(', ')}`);
            return res.status(500).json({ 
              message: "Структура базы данных не соответствует требуемой. Выполните команду update-db-schema.bat" 
            });
          }
        } catch (err) {
          console.error("Ошибка при проверке структуры таблицы:", err);
        }
      
      // Создаем товар
      const result = db.insert(
        `INSERT INTO products (
          name, description, price, original_price, 
          images, quantity, category, is_available, 
          is_preorder, is_rare, is_easy_to_care, 
          labels, delivery_cost, plant_size, light_level,
          humidity_level, plant_type, origin, is_pet_safe,
          is_air_purifying, is_flowering, is_hot_deal,
          is_bestseller, is_new_arrival, is_limited_edition, is_discounted, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.name, 
            productData.description || "", 
          productData.price, 
          productData.originalPrice || null, 
            JSON.stringify(productData.images || []), 
          productData.quantity || 0, 
            productData.category || "", 
          productData.isAvailable ? 1 : 0, 
          productData.isPreorder ? 1 : 0, 
          productData.isRare ? 1 : 0, 
          productData.isEasyToCare ? 1 : 0, 
          JSON.stringify(productData.labels || []), 
          productData.deliveryCost || 0,
          productData.plantSize,
          productData.lightLevel,
          productData.humidityLevel,
          productData.plantType,
          productData.origin,
          productData.isPetSafe ? 1 : 0,
          productData.isAirPurifying ? 1 : 0,
          productData.isFlowering ? 1 : 0,
          productData.isHotDeal ? 1 : 0,
          productData.isBestseller ? 1 : 0,
          productData.isNewArrival ? 1 : 0,
          productData.isLimitedEdition ? 1 : 0,
          productData.isDiscounted ? 1 : 0,
          new Date().toISOString()
        ]
      );
      
        console.log("Product created successfully with result:", result);
        
        // Получаем созданный товар по его ID
        try {
          console.log("ID нового товара:", result);
          
          // Проверяем, что result - это число
          if (result === undefined || result === null) {
            console.error("Не удалось получить ID созданного товара");
            return res.status(500).json({ message: "Ошибка при создании товара: не получен ID" });
          }
          
          // Сразу получаем товар по ID
          const newProduct = db.queryOne(
        "SELECT * FROM products WHERE id = ?",
            [result]
          );
          
          if (!newProduct) {
            console.error(`Товар с ID ${result} не найден после создания`);
            
            // Пытаемся получить последний добавленный товар
            const lastProduct = db.queryOne(
              "SELECT * FROM products ORDER BY id DESC LIMIT 1"
            );
            
            if (lastProduct) {
              console.log("Найден последний товар:", lastProduct);
              const formattedProduct = formatProductForClient(lastProduct);
              return res.status(201).json(formattedProduct);
            } else {
              return res.status(500).json({ message: "Товар создан, но не удалось получить данные" });
            }
          }
          
          console.log("Новый товар успешно получен:", newProduct);
          
          // Преобразуем строку JSON в массив для images и labels
          const formattedProduct = formatProductForClient(newProduct);
          
          // ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ О НОВОМ ТОВАРЕ ВСЕМ ПОЛЬЗОВАТЕЛЯМ
          try {
            const { sendNewProductNotificationToAllUsers } = await import('./telegram-bot-final.cjs');
            
            const notificationData = {
              productId: newProduct.id,
              productName: newProduct.name,
              productPrice: newProduct.price,
              productCategory: newProduct.category || 'Растения',
              productDescription: newProduct.description || 'Новое растение в нашем магазине!',
              productImage: newProduct.images ? JSON.parse(newProduct.images)[0] : undefined
            };
            
            console.log('📱 Отправляем уведомление о новом товаре:', notificationData);
            const sentCount = await sendNewProductNotificationToAllUsers(notificationData);
            console.log(`📱 Уведомление о новом товаре отправлено ${sentCount} пользователям`);
          } catch (telegramError) {
            console.error('❌ Ошибка отправки уведомления в Telegram:', telegramError);
            // Не прерываем выполнение, если уведомление не отправилось
          }
          
          // Отправляем товар клиенту
          res.status(201).json(formattedProduct);
        } catch (queryError) {
          console.error("Ошибка при получении созданного товара:", queryError);
          return res.status(500).json({ message: "Товар создан, но не удалось получить данные" });
        }
      } catch (dbError) {
        console.error("Database error creating product:", dbError);
        return res.status(500).json({ message: "Ошибка базы данных при создании товара" });
      }
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product", error: String(error) });
    }
  });
  
  // Update product
  app.put("/api/products/:id", ensureAdmin, async (req, res) => {
    try {
      const productId = req.params.id;
      const productData = req.body;
      
      console.log("Обновление товара, полученные данные:", productData);
      console.log("🏷️ Флажок isDiscounted:", productData.isDiscounted, typeof productData.isDiscounted);
      
      // Изображения должны быть массивом строк
      if (!productData.images) {
        productData.images = [];
      } else if (typeof productData.images === 'string') {
        productData.images = [productData.images];
      }
      
      console.log("Изображения товара:", productData.images);
      
      // Проверяем существование товара
      const existingProduct = db.query(
        "SELECT * FROM products WHERE id = ?",
        [productId]
      );
      
      if (existingProduct.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Обновляем товар
      db.update(
        `UPDATE products SET
          name = ?,
          description = ?,
          price = ?,
          original_price = ?,
          images = ?,
          quantity = ?,
          category = ?,
          is_available = ?,
          is_preorder = ?,
          is_rare = ?,
          is_easy_to_care = ?,
          labels = ?,
          delivery_cost = ?,
          plant_size = ?,
          light_level = ?,
          humidity_level = ?,
          plant_type = ?,
          origin = ?,
          is_pet_safe = ?,
          is_air_purifying = ?,
          is_flowering = ?,
          is_hot_deal = ?,
          is_bestseller = ?,
          is_new_arrival = ?,
          is_limited_edition = ?,
          is_discounted = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          productData.name, 
          productData.description, 
          parseFloat(productData.price), 
          productData.originalPrice ? parseFloat(productData.originalPrice) : null, 
          JSON.stringify(productData.images), 
          parseInt(productData.quantity) || 0, 
          productData.category, 
          productData.isAvailable === true || productData.isAvailable === 'true' ? 1 : 0, 
          productData.isPreorder === true || productData.isPreorder === 'true' ? 1 : 0, 
          productData.isRare === true || productData.isRare === 'true' ? 1 : 0, 
          productData.isEasyToCare === true || productData.isEasyToCare === 'true' ? 1 : 0, 
          JSON.stringify(productData.labels || []), 
          productData.deliveryCost ? parseFloat(productData.deliveryCost) : 0,
          productData.plantSize || 'medium',
          productData.lightLevel || 'moderate',
          productData.humidityLevel || 'medium',
          productData.plantType || 'decorative',
          productData.origin || 'tropical',
          productData.isPetSafe === true || productData.isPetSafe === 'true' ? 1 : 0,
          productData.isAirPurifying === true || productData.isAirPurifying === 'true' ? 1 : 0,
          productData.isFlowering === true || productData.isFlowering === 'true' ? 1 : 0,
          productData.isHotDeal === true || productData.isHotDeal === 'true' ? 1 : 0,
          productData.isBestseller === true || productData.isBestseller === 'true' ? 1 : 0,
          productData.isNewArrival === true || productData.isNewArrival === 'true' ? 1 : 0,
          productData.isLimitedEdition === true || productData.isLimitedEdition === 'true' ? 1 : 0,
          productData.isDiscounted === true || productData.isDiscounted === 'true' ? 1 : 0,
          new Date().toISOString(),
          productId
        ]
      );
      
      try {
      // Получаем обновленный товар
        const updatedProduct = db.queryOne(
        "SELECT * FROM products WHERE id = ?",
        [productId]
        );
        
        if (!updatedProduct) {
          return res.status(404).json({ message: "Товар не найден после обновления" });
        }
        
        console.log("Товар успешно обновлен:", updatedProduct);
        
        // Форматируем товар для клиента
        const formattedProduct = formatProductForClient(updatedProduct);
        
        res.json(formattedProduct);
      } catch (queryError) {
        console.error("Ошибка при получении обновленного товара:", queryError);
        return res.status(500).json({ message: "Товар обновлен, но не удалось получить данные" });
      }
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  
  // Delete product
  app.delete("/api/products/:id", ensureAdmin, async (req, res) => {
    try {
      const productId = req.params.id;
      
      // Проверяем, что ID является числом
      if (isNaN(parseInt(productId))) {
        return res.status(400).json({ message: "Некорректный ID товара" });
      }
      
      // Проверяем существование товара
      const existingProduct = db.query(
        "SELECT * FROM products WHERE id = ?",
        [productId]
      );
      
      if (existingProduct.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Удаляем товар
      db.delete(
        "DELETE FROM products WHERE id = ?",
        [productId]
      );
      
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });
  
  // Get unique categories
  app.get("/api/categories", async (req, res) => {
    try {
      const products = db.query("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''");
      const categories = products.map((product: any) => product.category).filter(Boolean);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  
  // Маршруты для работы с платежными реквизитами
  app.get("/api/payment-details", async (req, res) => {
    try {
      // Получаем платежные реквизиты (берем только первую запись)
      const paymentDetails = db.queryOne("SELECT * FROM payment_details LIMIT 1") as {
        id: number;
        card_number: string;
        card_holder: string;
        bank_name: string;
        qr_code_url: string;
        instructions: string;
        created_at: string;
        updated_at: string;
      } | null;
      
      if (!paymentDetails) {
        return res.status(404).json({ message: "Платежные реквизиты не найдены" });
      }
      
      // Возвращаем инструкции как bankDetails напрямую
      const formattedDetails = {
        id: paymentDetails.id,
        bankDetails: paymentDetails.instructions || '',
        qrCodeUrl: paymentDetails.qr_code_url,
        updatedAt: paymentDetails.updated_at
      };
      
      res.json(formattedDetails);
    } catch (error) {
      console.error("Error fetching payment details:", error);
      res.status(500).json({ message: "Failed to fetch payment details" });
    }
  });
  
  // Обновление платежных реквизитов
  app.put("/api/payment-details", ensureAdmin, async (req, res) => {
    try {
      console.log("Обновление платежных реквизитов:", req.body);
      const { bankDetails } = req.body;
      
      if (!bankDetails) {
        return res.status(400).json({ message: "Поле bankDetails обязательно" });
      }
      
      // Получаем текущие реквизиты
      const paymentDetails = db.queryOne("SELECT * FROM payment_details LIMIT 1") as {
        id: number;
        qr_code_url: string;
      } | null;
      
      if (!paymentDetails) {
        // Создаем новую запись, если не существует
        console.log("Создание новых платежных реквизитов");
        db.run(`
          INSERT INTO payment_details (
            card_number, card_holder, bank_name, instructions, qr_code_url
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          '', 
          '', 
          '', 
          bankDetails,
          '/uploads/default-qr.png'
        ]);
        
        const newDetails = db.queryOne("SELECT * FROM payment_details LIMIT 1") as {
          id: number;
          instructions: string;
          qr_code_url: string;
        };

        return res.json({
          id: newDetails.id,
          bankDetails: newDetails.instructions,
          qrCodeUrl: newDetails.qr_code_url,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Обновляем существующую запись
      console.log("Обновление существующих платежных реквизитов");
      
      const updateResult = db.run(`
        UPDATE payment_details SET 
        instructions = ?,
        updated_at = ?
        WHERE id = ?
      `, [
        bankDetails,
        new Date().toISOString(),
        paymentDetails.id
      ]);
      
      console.log("Обновлено записей:", updateResult.changes);
      
      const updatedDetails = db.queryOne("SELECT * FROM payment_details WHERE id = ?", [paymentDetails.id]) as {
        id: number;
        instructions: string;
        qr_code_url: string;
        updated_at: string;
      };
      
      res.json({
        id: updatedDetails.id,
        bankDetails: updatedDetails.instructions,
        qrCodeUrl: updatedDetails.qr_code_url,
        updatedAt: updatedDetails.updated_at
      });
    } catch (error) {
      console.error("Error updating payment details:", error);
      res.status(500).json({ message: "Failed to update payment details" });
    }
  });
  
  // Загрузка QR-кода для оплаты
  app.post("/api/upload-qr-code", ensureAdmin, upload.single("qrCode"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "QR-код не загружен" });
      }
      
      // Создаем URL к загруженному QR-коду
      const qrCodeUrl = `/uploads/${req.file.filename}`;
      console.log(`QR-код загружен: ${qrCodeUrl}`);
      
      // Обновляем URL QR-кода в базе данных
      const paymentDetails = db.queryOne("SELECT * FROM payment_details LIMIT 1") as {
        id: number;
      } | null;
      
      if (paymentDetails) {
        db.run(
          "UPDATE payment_details SET qr_code_url = ?, updated_at = ? WHERE id = ?",
          [qrCodeUrl, new Date().toISOString(), paymentDetails.id]
        );
      } else {
        // Создаем новую запись, если не существует
        db.run(`
          INSERT INTO payment_details (
            qr_code_url, card_number, card_holder, bank_name, instructions
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          qrCodeUrl, 
          '', 
          '', 
          '', 
          'Для оплаты отсканируйте QR-код или переведите деньги на указанную карту'
        ]);
      }
      
      res.json({ 
        message: "QR-код успешно загружен", 
        qrCodeUrl: qrCodeUrl
      });
    } catch (error) {
      console.error("Ошибка при загрузке QR-кода:", error);
      res.status(500).json({ message: "Ошибка при загрузке QR-кода" });
    }
  });
  
  // Telegram settings routes
  app.get("/api/telegram-settings", ensureAdmin, async (req, res) => {
    try {
      const settings = db.queryOne("SELECT * FROM telegram_settings LIMIT 1");
      if (!settings) {
        return res.json({
          botToken: "",
          chatId: "",
          enableNotifications: false
        });
      }
      
      res.json({
        botToken: settings.bot_token || "",
        chatId: settings.chat_id || "",
        enableNotifications: Boolean(settings.enable_notifications)
      });
    } catch (error) {
      console.error("Error fetching telegram settings:", error);
      res.status(500).json({ message: "Ошибка при загрузке настроек Telegram" });
    }
  });

  app.put("/api/telegram-settings", ensureAdmin, async (req, res) => {
    try {
      const { botToken, chatId, enableNotifications } = req.body;
      
      // Проверяем, существуют ли уже настройки
      const existing = db.queryOne("SELECT id FROM telegram_settings LIMIT 1");
      
      if (existing) {
        // Обновляем существующие настройки
        db.run(
          "UPDATE telegram_settings SET bot_token = ?, chat_id = ?, enable_notifications = ?, updated_at = ? WHERE id = ?",
          [botToken || "", chatId || "", enableNotifications ? 1 : 0, new Date().toISOString(), existing.id]
        );
      } else {
        // Создаем новые настройки
        db.run(
          "INSERT INTO telegram_settings (bot_token, chat_id, enable_notifications, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          [botToken || "", chatId || "", enableNotifications ? 1 : 0, new Date().toISOString(), new Date().toISOString()]
        );
      }
      
      res.json({ message: "Настройки Telegram успешно обновлены" });
    } catch (error) {
      console.error("Error updating telegram settings:", error);
      res.status(500).json({ message: "Ошибка при обновлении настроек Telegram" });
    }
  });

  // Test telegram bot connection
  app.post("/api/telegram-test", ensureAdmin, async (req, res) => {
    try {
      const { botToken, chatId } = req.body;
      
      if (!botToken || !chatId) {
        return res.status(400).json({ message: "Необходимо указать токен бота и ID чата" });
      }
      
      const { telegramService } = await import('./telegram');
      const result = await telegramService.testConnection(botToken, chatId);
      
      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(500).json({ message: result.message });
      }
    } catch (error) {
      console.error("Error testing telegram bot:", error);
      res.status(500).json({ message: `Ошибка тестирования бота: ${error.message}` });
    }
  });
  
  // Маршруты для работы с настройками
  app.get("/api/settings", async (req, res) => {
    try {
      // Получаем все настройки
      const settings = db.query("SELECT * FROM settings") as Array<{key: string, value: string}>;
      
      // Преобразуем в объект для удобства использования
      const settingsObj: Record<string, string> = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      
      res.json(settingsObj);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });
  
  // Tawk.to webhook handler
  app.post("/api/tawk-webhook", async (req, res) => {
    try {
      const { event, visitor } = req.body;
      
      // Обрабатываем только события начала чата
      if (event === "chat_started") {
        // Здесь можно добавить дополнительную логику, например:
        // - Сохранение информации о чате в базу данных
        // - Отправку уведомлений администраторам
        // - Логирование и т.д.
        console.log("Chat started with visitor:", visitor);
      }
      
      res.status(200).json({ message: "Webhook received" });
    } catch (error) {
      console.error("Error processing Tawk.to webhook:", error);
      res.status(500).json({ message: "Error processing webhook" });
    }
  });
  
  // Обновление настроек
  app.put("/api/settings", ensureAdmin, async (req, res) => {
    try {
      const updates = req.body;
      
      // Обновляем каждую настройку
      for (const [key, value] of Object.entries(updates)) {
        // Проверяем, существует ли настройка
        const existingSetting = db.queryOne("SELECT * FROM settings WHERE key = ?", [key]);
        
        if (existingSetting) {
          // Обновляем существующую настройку
          db.run(
            "UPDATE settings SET value = ?, updated_at = ? WHERE key = ?",
            [value, new Date().toISOString(), key]
          );
        } else {
          // Создаем новую настройку
          db.run(
            "INSERT INTO settings (key, value) VALUES (?, ?)",
            [key, value]
          );
        }
      }
      
      // Получаем обновленные настройки
      const settings = db.query("SELECT * FROM settings") as Array<{key: string, value: string}>;
      
      // Преобразуем в объект для удобства использования
      const settingsObj: Record<string, string> = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      
      res.json(settingsObj);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });
  
  // Минимальный набор маршрутов для тестирования
  app.get('/api/test', (req, res) => {
    res.json({ message: 'SQLite API is working!' });
  });

  // Добавляем маршруты для работы с отзывами
  app.get("/api/reviews", async (req, res) => {
    try {
      const { productId, approved } = req.query;
      
      if (productId) {
        // Получаем отзывы для конкретного товара (только одобренные для публичного доступа)
        const reviews = db.query(
          "SELECT * FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC",
          [productId]
        ) as Array<{
          id: number;
          user_id: string | number;
          product_id: number;
          rating: number;
          text: string;
          is_approved: number;
          created_at: string;
          images: string;
        }>;
        
        // Форматируем отзывы для клиента
        const formattedReviews = reviews.map(review => ({
          id: review.id,
          userId: review.user_id,
          productId: review.product_id,
          rating: review.rating,
          text: review.text,
          isApproved: !!review.is_approved,
          createdAt: review.created_at,
          images: review.images ? JSON.parse(review.images) : []
        }));
        
        return res.json(formattedReviews);
      }
      
      // Получаем все отзывы (для админки)
      const reviews = db.query("SELECT * FROM reviews ORDER BY created_at DESC") as Array<{
        id: number;
        user_id: string | number;
        product_id: number;
        rating: number;
        text: string;
        is_approved: number;
        created_at: string;
        images: string;
      }>;
      
      // Форматируем отзывы для клиента
      const formattedReviews = reviews.map(review => ({
        id: review.id,
        userId: review.user_id,
        productId: review.product_id,
        rating: review.rating,
        text: review.text,
        isApproved: !!review.is_approved,
        createdAt: review.created_at,
        images: review.images ? JSON.parse(review.images) : []
      }));
      
      res.json(formattedReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });
  
  // Добавляем маршрут для удаления отзыва
  app.delete("/api/reviews/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Проверяем, существует ли отзыв
      const review = db.queryOne("SELECT * FROM reviews WHERE id = ?", [id]);
      
      if (!review) {
        return res.status(404).json({ message: "Отзыв не найден" });
      }
      
      // Удаляем отзыв
      db.run("DELETE FROM reviews WHERE id = ?", [id]);
      
      // Возвращаем успех
      return res.status(200).json({ message: "Отзыв успешно удален" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Добавляем маршрут для редактирования отзыва (admin)
  app.put("/api/reviews/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isApproved } = req.body;
      
      // Проверяем, существует ли отзыв
      const review = db.queryOne("SELECT * FROM reviews WHERE id = ?", [id]) as {
        id: number;
        user_id: string | number;
        product_id: number;
        rating: number;
        text: string;
        is_approved: number;
        created_at: string;
        updated_at?: string;
        images?: string;
      } | null;
      
      if (!review) {
        return res.status(404).json({ message: "Отзыв не найден" });
      }
      
      console.log(`Обновление статуса отзыва #${id}: isApproved=${isApproved}`);
      
      // Обновляем статус отзыва
      db.run(
        "UPDATE reviews SET is_approved = ?, updated_at = ? WHERE id = ?",
        [isApproved ? 1 : 0, new Date().toISOString(), id]
      );
      
      // Получаем обновленный отзыв
      const updatedReview = db.queryOne("SELECT * FROM reviews WHERE id = ?", [id]) as {
        id: number;
        user_id: string | number;
        product_id: number;
        rating: number;
        text: string;
        is_approved: number;
        created_at: string;
        updated_at?: string;
        images?: string;
      };
      
      if (!updatedReview) {
        return res.status(404).json({ message: "Не удалось найти обновленный отзыв" });
      }
      
      console.log(`Отзыв #${id} обновлен. Новый статус: ${updatedReview.is_approved === 1 ? 'Одобрен' : 'Не одобрен'}`);
      
      // Форматируем отзыв для ответа
      const formattedReview = {
        id: updatedReview.id,
        userId: updatedReview.user_id,
        productId: updatedReview.product_id,
        rating: updatedReview.rating,
        text: updatedReview.text,
        images: updatedReview.images ? JSON.parse(updatedReview.images) : [],
        isApproved: updatedReview.is_approved === 1,
        createdAt: updatedReview.created_at,
        updatedAt: updatedReview.updated_at
      };
      
      res.json({
        message: isApproved ? "Отзыв успешно опубликован" : "Статус отзыва успешно обновлен",
        review: formattedReview
      });
    } catch (error) {
      console.error("Ошибка при обновлении отзыва:", error);
      res.status(500).json({ message: "Ошибка при обновлении отзыва" });
    }
  });

  // Добавляем маршрут для создания отзыва
  app.post("/api/reviews", ensureAuthenticated, async (req, res) => {
    try {
      const { productId, rating, text, images = [] } = req.body;
      
      // Проверяем, что пользователь авторизован
      if (!req.user) {
        return res.status(401).json({ message: "Необходима авторизация" });
      }
      
      // Проверка базовых данных
      if (!productId || !rating || !text) {
        return res.status(400).json({ message: "Не указаны обязательные поля" });
      }
      
      // Создаем отзыв
      const result = db.insert(
        `INSERT INTO reviews (
          user_id, product_id, rating, text, images, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          productId,
          rating,
          text,
          JSON.stringify(images || []),
          new Date().toISOString()
        ]
      );
      
      // Получаем созданный отзыв
      const review = db.queryOne(
        "SELECT * FROM reviews WHERE id = ?",
        [result]
      ) as {
        id: number;
        user_id: string | number;
        product_id: number;
        rating: number;
        text: string;
        is_approved: number;
        created_at: string;
        images: string;
      };
      
      // Форматируем отзыв для клиента
      const formattedReview = {
        id: review.id,
        userId: review.user_id,
        productId: review.product_id,
        rating: review.rating,
        text: review.text,
        isApproved: !!review.is_approved,
        createdAt: review.created_at,
        images: review.images ? JSON.parse(review.images) : []
      };
      
      res.status(201).json(formattedReview);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // User routes
  app.get("/api/users", ensureAdmin, async (req, res) => {
    try {
      // Получаем всех пользователей из базы данных с актуальными полями
      const users = db.query("SELECT id, username, email, full_name, phone, address, is_admin, balance, created_at FROM users") as Array<UserRecord>;
      
      console.log(`[DEBUG] Fetched ${users.length} users from database.`);
      
      // Форматируем пользователей и удаляем пароли (пароли уже не выбираются)
      const formattedUsers = users.map(user => ({
        id: user.id,
        username: user.username || user.email, // Использовать username или email как fallback
        email: user.email,
        fullName: user.full_name || '', // Использовать full_name напрямую
        phone: user.phone || '',
        address: user.address || '',
        isAdmin: !!user.is_admin,
        balance: user.balance || '0',
        createdAt: user.created_at
      }));
      
      res.json(formattedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Маршрут для начисления баланса пользователю
  app.post("/api/users/:id/add-balance", ensureAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { amount } = req.body;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Некорректная сумма для начисления" });
      }
      
      // Проверяем, существует ли пользователь
      const user = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]) as UserRecord | null;
      
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }
      
      // Вычисляем новый баланс
      const currentBalance = user.balance ? parseFloat(user.balance) : 0;
      const newBalance = (currentBalance + parseFloat(amount)).toString();
      
      // Обновляем баланс пользователя
      db.run(
        "UPDATE users SET balance = ?, updated_at = ? WHERE id = ?",
        [newBalance, new Date().toISOString(), userId]
      );
      
      // Получаем обновленного пользователя
      const updatedUser = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]) as UserRecord;
      
      // Форматируем пользователя и удаляем пароль
      const formattedUser = {
        id: updatedUser.id,
        username: updatedUser.username || updatedUser.email,
        email: updatedUser.email,
        fullName: updatedUser.full_name || '',
        phone: updatedUser.phone || '',
        address: updatedUser.address || '',
        isAdmin: !!updatedUser.is_admin,
        balance: updatedUser.balance || '0',
        createdAt: updatedUser.created_at
      };
      
      res.json(formattedUser);
    } catch (error) {
      console.error("Error adding balance:", error);
      res.status(500).json({ message: "Failed to add balance" });
    }
  });

  // Маршрут для экспорта статистики в Excel
  app.get("/api/export/statistics", ensureAdmin, async (req, res) => {
    try {
      // Получаем статистику из базы данных
      const users = db.query("SELECT * FROM users") as Array<any>;
      const products = db.query("SELECT * FROM products") as Array<any>;
      const orders = db.query("SELECT * FROM orders") as Array<any>;
      
      // Генерируем CSV для статистики
      const csvContent = generateStatisticsCSV(users, products, orders);
      
      // Добавляем BOM для правильного отображения кириллицы
      const BOM = '\uFEFF';
      const csvContentWithBOM = BOM + csvContent;
      
      // Отправляем CSV файл
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="statistics.csv"');
      res.send(csvContentWithBOM);
    } catch (error) {
      console.error("Error exporting statistics:", error);
      res.status(500).json({ message: "Failed to export statistics" });
    }
  });

  // Маршрут для экспорта пользователей в Excel
  app.get("/api/export/users", ensureAdmin, async (req, res) => {
    try {
      // Получаем всех пользователей
      const users = db.query("SELECT * FROM users") as Array<{
        id: string;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        address: string | null;
        is_admin: number;
        balance: string | null;
        created_at: string;
      }>;
      
      // Генерируем CSV для пользователей
      const csvContent = generateUsersCSV(users);
      
      // Добавляем BOM для правильного отображения кириллицы
      const BOM = '\uFEFF';
      const csvContentWithBOM = BOM + csvContent;
      
      // Отправляем CSV файл
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      res.send(csvContentWithBOM);
    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  // Маршрут для экспорта товаров в Excel
  app.get("/api/export/products", ensureAdmin, async (req, res) => {
    try {
      // Получаем все товары
      const products = db.query("SELECT * FROM products") as Array<{
        id: number;
        name: string;
        description: string;
        price: number;
        original_price: number | null;
        quantity: number;
        category: string;
        is_available: number;
        is_preorder: number;
        is_rare: number;
        is_easy_to_care: number;
        created_at: string;
      }>;
      
      // Генерируем CSV для товаров
      const csvContent = generateProductsCSV(products);
      
      // Добавляем BOM для правильного отображения кириллицы
      const BOM = '\uFEFF';
      const csvContentWithBOM = BOM + csvContent;
      
      // Отправляем CSV файл
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
      res.send(csvContentWithBOM);
    } catch (error) {
      console.error("Error exporting products:", error);
      res.status(500).json({ message: "Failed to export products" });
    }
  });

  // Маршрут для экспорта заказов в Excel
  app.get("/api/export/orders", ensureAdmin, async (req, res) => {
    try {
      // Получаем все заказы
      const orders = db.query("SELECT * FROM orders ORDER BY created_at DESC") as Array<{
        id: number;
        user_id: string;
        items: string;
        total_amount: string;
        delivery_amount: string;
        full_name: string;
        phone: string;
        address: string;
        delivery_type: string;
        payment_method: string;
        payment_status: string;
        order_status: string;
        created_at: string;
      }>;
      
      // Генерируем CSV для заказов
      const csvContent = generateOrdersCSV(orders);
      
      // Добавляем BOM для правильного отображения кириллицы
      const BOM = '\uFEFF';
      const csvContentWithBOM = BOM + csvContent;
      
      // Отправляем CSV файл
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
      res.send(csvContentWithBOM);
    } catch (error) {
      console.error("Error exporting orders:", error);
      res.status(500).json({ message: "Failed to export orders" });
    }
  });

  // Helper function для форматирования заказа
  function formatOrderForClient(order: any) {
    if (!order) return null;
    
    // Преобразуем JSON строку items в массив объектов
    let items;
    try {
      if (typeof order.items === 'string') {
        items = JSON.parse(order.items);
      } else if (Array.isArray(order.items)) {
        items = order.items;
      } else {
        items = [];
      }
    } catch (e) {
      console.error("Ошибка при парсинге списка товаров:", e);
      items = [];
    }

    // Вычисляем сумму товаров без доставки
    const itemsTotal = items.reduce((sum: number, item: any) => {
      const price = parseFloat(String(item.price || 0));
      const quantity = parseInt(String(item.quantity || 1));
      return sum + (price * quantity);
    }, 0);

    // Вычисляем скидку только от суммы товаров
    let promoCodeDiscount = null;
    if (order.promo_code_discount) {
      const discount = parseFloat(String(order.promo_code_discount));
      // Если скидка больше суммы товаров, ограничиваем её
      promoCodeDiscount = Math.min(discount, itemsTotal);
    }

    // Форматируем заказ для клиента
    return {
      id: order.id,
      userId: order.user_id || order.userId,
      items: items,
      itemsTotal: itemsTotal.toString(), // Добавляем сумму товаров без доставки
      totalAmount: order.total_amount,
      deliveryAmount: order.delivery_amount || order.deliveryAmount || "0",
      promoCode: order.promo_code || null,
      promoCodeDiscount: promoCodeDiscount ? promoCodeDiscount.toString() : null,
      fullName: order.full_name || order.fullName || "",
      address: order.address || "",
      phone: order.phone || "",
      socialNetwork: order.social_network || order.socialNetwork || null,
      socialUsername: order.social_username || order.socialUsername || null,
      comment: order.comment || "",
      deliveryType: order.delivery_type || order.deliveryType || "cdek",
      deliverySpeed: order.delivery_speed || order.deliverySpeed || 'standard',
      needInsulation: order.need_insulation === 1 || order.needInsulation === true,
      paymentMethod: order.payment_method || order.paymentMethod || "card",
      paymentStatus: order.payment_status || order.paymentStatus || "pending",
      orderStatus: order.order_status || order.orderStatus || "pending",
      paymentProofUrl: order.payment_proof_url ? 
        (order.payment_proof_url.startsWith('http') ? order.payment_proof_url : `${process.env.PUBLIC_URL || ''}${order.payment_proof_url}`) : 
        null,
      adminComment: order.admin_comment || order.adminComment || "",
      trackingNumber: order.tracking_number || order.trackingNumber || null,
      estimatedDeliveryDate: order.estimated_delivery_date || order.estimatedDeliveryDate || null,
      actualDeliveryDate: order.actual_delivery_date || order.actualDeliveryDate || null,
      lastStatusChangeAt: order.last_status_change_at || order.lastStatusChangeAt || null,
      statusHistory: order.status_history || order.statusHistory || null,
      createdAt: order.created_at || order.createdAt || new Date().toISOString(),
      updatedAt: order.updated_at || order.updatedAt || null
    };
  }

  // Маршрут для обработки загрузки подтверждения оплаты
  app.post("/api/orders/:id/payment-proof", ensureAuthenticated, upload.single("proof"), async (req, res) => {
    try {
      if (!req.file) {
        console.error("[PAYMENT] Ошибка загрузки чека: файл не найден");
        return res.status(400).json({ message: "Файл не найден" });
      }
      
      const id = parseInt(req.params.id);
      const orderId = id.toString();
      
      console.log(`[PAYMENT] Загрузка чека для заказа ID=${orderId}, файл: ${req.file.filename}`);
      console.log(`[PAYMENT] Полный путь к файлу: ${path.resolve(req.file.path)}`);
      
      // Проверяем существование заказа
      const order = db.queryOne("SELECT * FROM orders WHERE id = ?", [orderId]);
      if (!order) {
        console.error(`[PAYMENT] Заказ с ID=${orderId} не найден`);
        return res.status(404).json({ message: "Заказ не найден" });
      }
      
      // Формируем путь для доступа к файлу - сделаем его относительно корня сайта
      const relativePath = `/uploads/${req.file.filename}`;
      console.log(`[PAYMENT] Относительный путь для веб-доступа: ${relativePath}`);
      
      // Обновляем запись в базе данных
      db.run(
        "UPDATE orders SET payment_proof_url = ?, payment_status = ?, updated_at = ? WHERE id = ?",
        [relativePath, "pending_verification", new Date().toISOString(), orderId]
      );
      
      console.log(`[PAYMENT] Информация о чеке сохранена для заказа #${orderId}`);
      
      // Отправляем уведомление администратору о загрузке чека через систему админ-панели
      try {
        const { telegramService } = await import('./telegram');
        
        // Получаем данные пользователя
        const user = db.queryOne("SELECT full_name, email FROM users WHERE id = ?", [order.user_id]) as { full_name: string; email: string } | null;
        
        // Создаем данные для уведомления
        const telegramOrderData = {
          id: Number(orderId),
          userId: String(order.user_id),
          userName: user?.full_name || order.full_name,
          userEmail: user?.email || 'Не указан',
          userPhone: order.phone,
          totalAmount: order.total_amount,
          paymentMethod: "directTransfer",
          deliveryAddress: order.address,
          items: [],
          createdAt: order.created_at
        };
        
        const notificationSent = await telegramService.sendPaymentProofNotification(telegramOrderData);
        if (notificationSent) {
          console.log(`✅ Уведомление о загрузке чека для заказа #${orderId} отправлено`);
        } else {
          console.log(`📱 Не удалось отправить уведомление о загрузке чека для заказа #${orderId}`);
        }
      } catch (error) {
        console.error("Error sending admin notification about payment proof:", error);
        // Не прерываем загрузку чека если уведомление не отправилось
      }
      
      // Получаем обновленный заказ
      const updatedOrder = db.queryOne("SELECT * FROM orders WHERE id = ?", [orderId]);
      
      // Возвращаем успешный результат с данными заказа
      return res.status(200).json({
        success: true,
        message: "Чек успешно загружен",
        order: updatedOrder
      });
    } catch (error) {
      console.error("[PAYMENT] Ошибка загрузки чека:", error);
      return res.status(500).json({ 
        success: false,
        message: "Произошла ошибка при загрузке чека",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Новый маршрут для финализации заказа после загрузки чека
  app.post("/api/orders/:id/complete", ensureAuthenticated, async (req, res) => {
    try {
      const orderId = req.params.id;
      
      // Получаем заказ из БД с явной типизацией
      const order = db.queryOne("SELECT * FROM orders WHERE id = ?", [orderId]) as Record<string, any> | null;
      
      if (!order) {
        return res.status(404).json({ message: "Заказ не найден" });
      }
      
      // Проверяем доступ пользователя к этому заказу
      const user = req.user as any;
      if (!user.isAdmin && order.user_id !== user.id && order.user_id !== String(user.id)) {
        return res.status(403).json({ message: "Доступ запрещен" });
      }
      
      // Если чек уже загружен, меняем статус на "завершен"
      if (order.payment_proof_url) {
        db.run(
          `UPDATE orders SET 
           payment_status = ?, 
           order_status = ?, 
           updated_at = ? 
           WHERE id = ?`,
          ["verification", "pending", new Date().toISOString(), orderId]
        );
        
        // Send user notification via Telegram bot about completed order
        try {
          const { sendOrderNotificationToUser } = await import('./telegram-bot-final.cjs');
          
          // Parse items for user notification
          const parsedItems = JSON.parse(order.items);
          const itemsWithDetails = parsedItems.map((item: any) => {
            const product = db.queryOne("SELECT name, price FROM products WHERE id = ?", [item.id]) as { name: string; price: number } | null;
            return {
              name: product?.name || 'Неизвестный товар',
              quantity: item.quantity,
              price: product?.price || 0
            };
          });
          
          const userOrderData = {
            orderId: String(orderId),
            userName: order.full_name,
            totalAmount: parseFloat(order.total_amount),
            paymentMethod: order.payment_method,
            items: itemsWithDetails,
            orderStatus: "pending",
            paymentStatus: "verification"
          };
          
          const notificationSent = await sendOrderNotificationToUser(order.user_id, userOrderData);
          if (notificationSent) {
            console.log(`✅ Уведомление о завершении заказа #${orderId} отправлено пользователю`);
          } else {
            console.log(`📱 Не удалось отправить уведомление о завершении заказа #${orderId} пользователю`);
          }
        } catch (error) {
          console.error("Error sending user completion notification:", error);
          // Don't fail the order completion if notification fails
        }
        
        // Возвращаем обновленный заказ
        const updatedOrder = db.queryOne(`SELECT * FROM orders WHERE id = ?`, [orderId]);
        const formattedOrder = formatOrderForClient(updatedOrder);
        
        return res.json({
          success: true,
          message: "Заказ успешно завершен и ожидает проверки оплаты",
          order: formattedOrder
        });
      } else {
        return res.status(400).json({ message: "Отсутствует подтверждение оплаты" });
      }
    } catch (error) {
      console.error("Error completing order:", error);
      res.status(500).json({ message: "Ошибка при завершении заказа" });
    }
  });

  // Type definitions for order creation
  interface CreateOrderRequest {
    userId: number;
    items: Array<{
      id: number;
      quantity: number;
    }>;
    deliveryAmount: number;
    fullName: string;
    address: string;
    phone: string;
    socialNetwork?: string;
    socialUsername?: string;
    comment?: string;
    needInsulation: boolean;
    deliveryType: string;
    deliverySpeed?: string;
    paymentMethod: string;
    paymentProof?: string;
    promoCode?: string;
  }

  // Type definitions for database queries
  interface ProductQuery {
    id: number;
    name: string;
    price: number;
    quantity: number;
    images?: string;
    [key: string]: any;
  }

  interface PromoCodeQuery {
    id: number;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number | null;
    start_date: string;
    end_date: string;
    max_uses: number | null;
    current_uses: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  // POST /api/orders - Create new order
  app.post("/api/orders", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const orderData = req.body as CreateOrderRequest;
      
      console.log("Received order data:", orderData);
      
      // Ensure userId matches authenticated user or admin
      if (String(user.id) !== String(orderData.userId) && !user.isAdmin) {
        return res.status(403).json({ message: "Нельзя создать заказ от имени другого пользователя" });
      }
      
      // Validate required fields
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({ message: "Корзина пуста или имеет неверный формат" });
      }
      
      // Изменена проверка, чтобы пропускать 0 как валидное значение доставки
      if (orderData.deliveryAmount === undefined || orderData.deliveryAmount === null || typeof orderData.deliveryAmount !== 'number') {
        return res.status(400).json({ message: "Не указана стоимость доставки" });
      }

      // Validate and calculate items total
      let itemsTotal = 0;
      for (const item of orderData.items) {
        const product = db.queryOne(
          "SELECT * FROM products WHERE id = ?",
          [item.id]
        ) as ProductQuery | null;
        
        if (!product) {
          return res.status(400).json({ 
            message: `Товар с ID ${item.id} не найден` 
          });
        }
        
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Недостаточное количество товара \"${product.name}\" в наличии (доступно: ${product.quantity})` 
          });
        }

        itemsTotal += product.price * item.quantity;
      }

      // Validate and calculate promo code discount (только на товары, не на доставку)
      let promoCodeDiscount = 0;
      if (orderData.promoCode) {
        const promoCode = db.queryOne(
          `SELECT * FROM promo_codes 
           WHERE code = ? 
           AND is_active = 1 
           AND (start_date <= datetime('now') AND end_date >= datetime('now'))
           AND (max_uses IS NULL OR current_uses < max_uses)`,
          [orderData.promoCode.toUpperCase()]
        ) as PromoCodeQuery | null;

        if (promoCode) {
          // Check minimum order amount
          if (promoCode.min_order_amount && itemsTotal < promoCode.min_order_amount) {
            return res.status(400).json({ 
              message: `Минимальная сумма заказа для применения промокода: ${promoCode.min_order_amount} ₽` 
            });
          }

          // Calculate discount
          if (promoCode.discount_type === 'percentage') {
            promoCodeDiscount = Math.round(itemsTotal * (promoCode.discount_value / 100));
          } else {
            promoCodeDiscount = promoCode.discount_value;
          }

          // Ensure discount doesn't exceed items total
          promoCodeDiscount = Math.min(promoCodeDiscount, itemsTotal);
        } else {
          return res.status(400).json({ message: "Недействительный промокод" });
        }
      }

      // Логируем входящий deliveryAmount
      console.log('Received deliveryAmount:', orderData.deliveryAmount, 'Способ доставки:', orderData.deliveryType);

      // Calculate final total: (товары - скидка) + доставка
      const totalAmount = Math.max(0, itemsTotal - promoCodeDiscount) + orderData.deliveryAmount;
      console.log('Calculated totalAmount:', totalAmount);

      // Check balance if payment method is balance
      if (orderData.paymentMethod === "balance") {
        const userBalance = db.queryOne("SELECT balance FROM users WHERE id = ?", [String(orderData.userId)]) as { balance: string } | null;
        
        if (!userBalance) {
          return res.status(404).json({ message: "Пользователь не найден" });
        }

        const currentBalance = parseFloat(userBalance.balance || "0");
        
        if (currentBalance < totalAmount) {
          return res.status(400).json({ 
            message: `Недостаточно средств на балансе. Требуется: ${totalAmount} ₽, доступно: ${currentBalance} ₽` 
          });
        }
      }

      // Prepare order data for saving
      const orderToSave = {
        user_id: orderData.userId,
        // Save full item details including name and price
        items: JSON.stringify(orderData.items.map((item: { id: number, quantity: number }) => {
          const product = db.queryOne("SELECT id, name, price FROM products WHERE id = ?", [item.id]) as ProductQuery | null;
          return {
            id: item.id,
            name: product?.name || "Unknown Product", // Use product name or fallback
            price: product?.price || 0, // Use product price or fallback
            quantity: item.quantity,
          };
        })),
        total_amount: totalAmount,
        delivery_amount: orderData.deliveryAmount,
        full_name: orderData.fullName,
        address: orderData.address,
        phone: orderData.phone,
        social_network: orderData.socialNetwork || null,
        social_username: orderData.socialUsername || null,
        comment: orderData.comment || null,
        need_insulation: orderData.needInsulation ? 1 : 0,
        delivery_type: orderData.deliveryType,
        delivery_speed: orderData.deliverySpeed || null,
        payment_method: orderData.paymentMethod,
        payment_status: orderData.paymentMethod === "balance" ? "completed" : "pending",
        order_status: orderData.paymentMethod === "balance" ? "processing" : "pending",
        payment_proof_url: orderData.paymentProof || null,
        admin_comment: null,
        promo_code: orderData.promoCode || null,
        promo_code_discount: promoCodeDiscount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Start transaction
      db.exec("BEGIN TRANSACTION");

      try {
        // Save order
      const result = db.run(
        `INSERT INTO orders (
          user_id, items, total_amount, delivery_amount, full_name, 
          address, phone, social_network, social_username, comment,
          need_insulation, delivery_type, delivery_speed,
          payment_method, payment_status, order_status,
          payment_proof_url, admin_comment, promo_code, promo_code_discount,
          created_at, updated_at, last_status_change_at, status_history,
          product_quantities_reduced, tracking_number, estimated_delivery_date,
          actual_delivery_date, ozonpay_payment_id, ozonpay_payment_url,
          ozonpay_payment_status, ozonpay_transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderToSave.user_id,
          orderToSave.items,
          orderToSave.total_amount,
          orderToSave.delivery_amount,
          orderToSave.full_name,
          orderToSave.address,
          orderToSave.phone,
          orderToSave.social_network,
          orderToSave.social_username,
          orderToSave.comment,
          orderToSave.need_insulation,
          orderToSave.delivery_type,
          orderToSave.delivery_speed,
          orderToSave.payment_method,
          orderToSave.payment_status,
          orderToSave.order_status,
          orderToSave.payment_proof_url,
          orderToSave.admin_comment,
          orderToSave.promo_code,
          orderToSave.promo_code_discount,
          orderToSave.created_at,
          orderToSave.updated_at,
          orderToSave.created_at, // last_status_change_at
          null, // status_history
          0, // product_quantities_reduced (SQLite boolean as integer)
          null, // tracking_number
          null, // estimated_delivery_date
          null, // actual_delivery_date
          null, // ozonpay_payment_id
          null, // ozonpay_payment_url
          null, // ozonpay_payment_status
          null  // ozonpay_transaction_id
        ]
      );
      
      const orderId = result.lastInsertRowid;

        // Update promo code usage if applicable
        if (orderData.promoCode) {
          db.run(
            `UPDATE promo_codes 
             SET current_uses = current_uses + 1 
             WHERE code = ?`,
            [orderData.promoCode.toUpperCase()]
          );

          db.run(
            `INSERT INTO promo_code_uses (promo_code_id, user_id, order_id, discount_amount, used_at)
             SELECT id, ?, ?, ?, datetime('now')
             FROM promo_codes WHERE code = ?`,
            [orderData.userId, orderId, promoCodeDiscount, orderData.promoCode.toUpperCase()]
          );
        }

        // If payment is completed (balance or proof provided), reduce product quantities
        if (orderData.paymentMethod === "balance" || orderData.paymentProof) {
        for (const item of orderData.items) {
            db.run(
              `UPDATE products 
               SET quantity = quantity - ? 
               WHERE id = ?`,
              [item.quantity, item.id]
            );
          }

          // Mark order as having reduced quantities
            db.run(
            `UPDATE orders 
             SET product_quantities_reduced = 1 
             WHERE id = ?`,
            [orderId]
          );
        }

        // If payment method is balance, deduct amount from user balance
        if (orderData.paymentMethod === "balance") {
          console.log(`Processing balance payment for user ${orderData.userId}, total: ${totalAmount}`);
          
          const currentUserBalance = db.queryOne("SELECT balance FROM users WHERE id = ?", [String(orderData.userId)]) as { balance: string } | null;
          
          console.log(`Current user balance query result:`, currentUserBalance);
          
          if (currentUserBalance) {
            const currentBalance = parseFloat(currentUserBalance.balance || "0");
            const newBalance = currentBalance - totalAmount;
            
            console.log(`Updating balance: ${currentBalance} - ${totalAmount} = ${newBalance}`);
            
                         const updateResult = db.run(
               `UPDATE users 
                SET balance = ?, updated_at = datetime('now') 
                WHERE id = ?`,
               [newBalance.toFixed(2), String(orderData.userId)]
             );
            
            console.log(`Balance update result:`, updateResult);
            console.log(`Balance updated for user ${orderData.userId}: ${currentBalance} -> ${newBalance.toFixed(2)}`);
          } else {
            console.error(`No user found with ID ${orderData.userId} for balance deduction`);
          }
        }

        // Commit transaction
        db.exec("COMMIT");

        // Get created order
        const createdOrder = db.queryOne(
          "SELECT * FROM orders WHERE id = ?",
          [orderId]
        ) as Order | null;

        if (!createdOrder) {
          throw new Error("Заказ не найден после создания");
        }

        const formattedOrder = formatOrderForClient(createdOrder);

        // Send Telegram notification about new order
        try {
          const { telegramService } = await import('./telegram');
          
          // Get user details for notification
          const userRecord = db.queryOne("SELECT email, full_name FROM users WHERE id = ?", [orderData.userId]) as { email: string; full_name: string } | null;
          
          // Parse items for notification
          const parsedItems = JSON.parse(createdOrder.items);
          const itemsWithDetails = parsedItems.map((item: any) => {
            const product = db.queryOne("SELECT name, price FROM products WHERE id = ?", [item.id]) as { name: string; price: number } | null;
            return {
              name: product?.name || 'Неизвестный товар',
              quantity: item.quantity,
              price: product?.price || 0
            };
          });
          
          const telegramOrderData = {
            id: Number(orderId),
            userId: String(orderData.userId),
            userName: userRecord?.full_name || orderData.fullName,
            userEmail: userRecord?.email || 'Не указан',
            userPhone: orderData.phone,
            totalAmount: totalAmount,
            paymentMethod: orderData.paymentMethod,
            deliveryAddress: orderData.address,
            items: itemsWithDetails,
            createdAt: createdOrder.created_at
          };
          
          await telegramService.sendOrderNotification(telegramOrderData);
        } catch (error) {
          console.error("Error sending Telegram notification:", error);
          // Don't fail the order creation if Telegram notification fails
        }

        // Не отправляем уведомление пользователю при создании заказа
        // Уведомление будет отправлено при завершении заказа (/complete)
        console.log(`📋 Заказ #${orderId} создан, уведомление пользователю будет отправлено при завершении`);

        // If payment method is ozonpay, create payment
        if (orderData.paymentMethod === "ozonpay") {
          // Проверка: если итоговая сумма <= 0, не создавать ссылку на оплату
          if (totalAmount <= 0) {
            return res.status(400).json({
              ...formattedOrder,
              paymentError: "Сумма заказа с учётом скидки должна быть больше 0 для онлайн-оплаты."
            });
          }
          try {
            const ozonPayAPI = createOzonPayAPI();
            
            // Get user email for payment
            const userRecord = db.queryOne("SELECT email FROM users WHERE id = ?", [orderData.userId]) as { email: string } | null;
            
            const paymentData = {
              amount: Math.round(totalAmount * 100), // Convert to kopecks
              currency: "RUB",
              orderId: String(orderId),
              description: `Заказ #${orderId} на сайте Russkii Portal`,
              customerEmail: userRecord?.email,
              customerPhone: orderData.phone
            };

            // Prepare order items for Ozon Pay
            const parsedItems = JSON.parse(createdOrder.items);
            console.log('Parsed order items for OzonPay:', parsedItems);
            
            // Распределяем скидку по товарам пропорционально
            let totalItemsPrice = 0;
            parsedItems.forEach((item: any) => {
              totalItemsPrice += (item.price || 0) * (item.quantity || 1);
            });
            let remainingDiscount = createdOrder.promo_code_discount || 0;
            const discountedOrderItems = parsedItems.map((item: any, index: number) => {
              // Добавляем timestamp к ID чтобы избежать конфликтов с каталогом Ozon Pay
              const extId = item.id != null ? `FRESH_${Date.now()}_${String(item.id)}` : `item_${Date.now()}_${index}`;
              const itemTotal = (item.price || 0) * (item.quantity || 1);
              // Пропорциональная скидка
              let itemDiscount = 0;
              if (index === parsedItems.length - 1) {
                // Последнему товару — остаток скидки (чтобы не было расхождения из-за округления)
                itemDiscount = remainingDiscount;
              } else {
                itemDiscount = Math.round((itemTotal / totalItemsPrice) * (createdOrder.promo_code_discount || 0));
                remainingDiscount -= itemDiscount;
              }
              const discountedPrice = Math.max(0, (item.price || 0) - (itemDiscount / (item.quantity || 1)));
              // Делаем название уникальным чтобы Ozon Pay не матчил по каталогу
              const cleanName = `${(item.name || 'Неизвестный товар')} [Заказ #${orderId}]`
                .replace(/×/g, 'x')
                .replace(/[^\w\s\-\(\)\.#]/g, '')
                .trim();
              return {
                extId,
                name: cleanName,
                price: {
                  currencyCode: "643",
                  value: Math.round(discountedPrice * 100)
                },
                quantity: item.quantity,
                type: "TYPE_PRODUCT",
                unitType: "UNIT_PIECE",
                vat: "VAT_NONE",
                needMark: false
              };
            });
            let orderItems = discountedOrderItems;
            // Добавляем доставку отдельной позицией, если она есть и способ не самовывоз
            if (createdOrder.delivery_amount > 0 && createdOrder.delivery_type !== 'Самовывоз') {
              orderItems.push({
                extId: 'delivery-service',
                name: 'Доставка товаров',
                price: {
                  currencyCode: "643",
                  value: Math.round(createdOrder.delivery_amount * 100)
                },
                quantity: 1,
                type: "TYPE_PRODUCT",
                unitType: "UNIT_PIECE",
                vat: "VAT_NONE",
                needMark: false
              });
            }
            
            // Доставка ВКЛЮЧАЕТСЯ в онлайн-оплату
            console.log('Final OzonPay order items:', orderItems);
            
            // Сумма для OzonPay = общая сумма заказа включая доставку
            const paymentAmount = createdOrder.total_amount;
            console.log(`OzonPay payment amount: ${paymentAmount} ₽ (общая сумма с доставкой ${createdOrder.total_amount} ₽)`);
            
            // Обновляем paymentData с полной суммой включая доставку
            paymentData.amount = Math.round(paymentAmount * 100); // Convert to kopecks, включая доставку
            paymentData.orderId = String(orderId);
            paymentData.description = `Заказ #${orderId} на сайте Helen's Jungle (включая доставку)`;
            paymentData.customerEmail = user.email;
            paymentData.customerPhone = createdOrder.phone;

            const paymentResponse = await ozonPayAPI.createPayment(paymentData, orderItems);
            
            // ⚠️ ПРОВЕРКА: Если заказ уже оплачен при создании - это проблема!
            if (paymentResponse.status === 'STATUS_PAID') {
              console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Ozon Pay вернул STATUS_PAID сразу при создании заказа!');
              console.error('Это указывает на проблему с интеграцией (тестовый режим или неправильные ключи)');
              
              // Вместо редиректа на оплату показываем ошибку
              res.status(201).json({
                ...formattedOrder,
                paymentError: "⚠️ Обнаружена проблема с платежной системой. Заказ создан успешно. Для оплаты обратитесь в поддержку или выберите другой способ оплаты.",
                code: "PAYMENT_SYSTEM_ERROR"
              });
              return;
            }
            
            // Save payment details to database
            db.run(
              `UPDATE orders SET 
               ozonpay_payment_id = ?,
               ozonpay_payment_url = ?
               WHERE id = ?`,
              [paymentResponse.orderId, paymentResponse.paymentUrl, orderId]
            );

            // Return order with payment URL
            res.status(201).json({
              ...formattedOrder,
              paymentUrl: paymentResponse.paymentUrl,
              paymentId: paymentResponse.orderId
            });
          } catch (error) {
            console.error("Ошибка при создании платежа Ozon Pay:", error);
            
            // Обработка недоступности Ozon Pay API
            if (error.message === 'OZON_PAY_API_UNAVAILABLE') {
              res.status(201).json({
                ...formattedOrder,
                paymentError: "⚠️ Платежная система временно недоступна. Заказ создан, но ссылка на оплату будет предоставлена позже. Свяжитесь с поддержкой.",
                code: "PAYMENT_SERVICE_UNAVAILABLE"
              });
            } else {
            // Return order without payment URL, user can try again later
            res.status(201).json({
              ...formattedOrder,
              paymentError: "Ошибка при создании ссылки на оплату. Обратитесь в поддержку."
            });
            }
          }
        } else {
          res.status(201).json(formattedOrder);
        }
      } catch (error) {
        // Rollback transaction on error
        db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Ошибка при создании заказа" });
    }
  });

  // Получение всех заказов (для админки)
  app.get("/api/orders", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      let orders: Record<string, any>[];
      let totalCount: number = 0;

      // TypeScript type assertion for user
      const user = req.user as Express.User;

      // Параметры пагинации
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50)); // Максимум 100 за раз
      const offset = (page - 1) * limit;

      // Параметры фильтрации
      const statusFilter = req.query.status as string;
      const searchQuery = req.query.search as string;

      if (user.isAdmin) {
        // Build WHERE clause for admin
        let whereClause = "";
        let params: any[] = [];

        if (statusFilter) {
          whereClause += " WHERE order_status = ?";
          params.push(statusFilter);
        }

        if (searchQuery) {
          const searchCondition = whereClause ? " AND " : " WHERE ";
          whereClause += searchCondition + "(CAST(id AS TEXT) LIKE ? OR full_name LIKE ? OR phone LIKE ? OR address LIKE ?)";
          const searchPattern = `%${searchQuery}%`;
          params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM orders${whereClause}`;
        const countResult = db.queryOne(countQuery, params) as { total: number };
        totalCount = countResult.total;

        // Get paginated orders
        const ordersQuery = `SELECT * FROM orders${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        orders = db.query(ordersQuery, [...params, limit, offset]) as Record<string, any>[];
      } else {
        // For regular users - get their orders only
        let whereClause = "WHERE user_id = ?";
        let params: any[] = [user.id];

        if (statusFilter) {
          whereClause += " AND order_status = ?";
          params.push(statusFilter);
        }

        if (searchQuery) {
          whereClause += " AND (CAST(id AS TEXT) LIKE ? OR full_name LIKE ? OR phone LIKE ? OR address LIKE ?)";
          const searchPattern = `%${searchQuery}%`;
          params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
        const countResult = db.queryOne(countQuery, params) as { total: number };
        totalCount = countResult.total;

        // Get paginated orders
        const ordersQuery = `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        orders = db.query(ordersQuery, [...params, limit, offset]) as Record<string, any>[];
      }

      // Enrich orders with product information and format for client
      const formattedOrders = await Promise.all(orders.map(async (order) => {
        try {
          // Use formatOrderForClient to handle initial formatting and JSON parsing
          const formatted = formatOrderForClient(order);

          // If formatting failed, return the basic order
          if (!formatted) {
            return order; // Or handle appropriately, e.g., return null or error indicator
          }

          // Enrich items within the formatted order if needed
          const items = formatted.items || [];

          const enrichedItems = await Promise.all(items.map(async (item: any) => {
            // Check if product details are already present (added by formatOrderForClient)
            if (!item.productName || !item.productImage || item.price === undefined) {
               const product = db.queryOne("SELECT id, name, images, price FROM products WHERE id = ?", [item.id]) as {
                id: number;
                name: string;
                images: string;
                price: number;
                [key: string]: any;
              } | null;

              if (product) {
                const productImages = product.images ? JSON.parse(product.images) : [];
                const imageUrl = productImages && productImages.length > 0 ? productImages[0] : null;

                return {
                  ...item,
                  productName: item.productName || product.name, // Use existing or product name
                  productImage: item.productImage || imageUrl, // Use existing or product image
                  price: item.price !== undefined ? item.price : product.price // Use item price if defined, otherwise product price
                };
              }
            }
            return item; // Return item as is if product not found or already enriched
          }));

          return {
            ...formatted,
            items: enrichedItems // Use enriched items in the final formatted object
          };

        } catch (error) {
          console.error(`Ошибка при обработке заказа #${order.id} для списка:`, error);
          return formatOrderForClient(order); // Return basic formatted order on error
        }
      }));

      // Return orders with pagination info
      res.json({
        orders: formattedOrders,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Ошибка при получении списка заказов:", error);
      res.status(500).json({ message: "Ошибка при получении списка заказов" });
    }
  });
  
  // Получение конкретного заказа
  app.get("/api/orders/:id", ensureAuthenticated, async (req, res) => {
    try {
      const orderId = req.params.id;
      
      // TypeScript type assertion for user
      const user = req.user as Express.User;
      
      let order: Record<string, any> | null;
      
      if (user.isAdmin) {
        // Admin can view any order
        order = db.queryOne("SELECT * FROM orders WHERE id = ?", [orderId]) as Record<string, any> | null;
      } else {
        // Users can only view their own orders
        order = db.queryOne("SELECT * FROM orders WHERE id = ? AND user_id = ?", [orderId, user.id]) as Record<string, any> | null;
      }
      
      if (!order) {
        return res.status(404).json({ message: "Заказ не найден" });
      }
      
      console.log(`[DEBUG] GET /api/orders/${orderId} - Order fetched from DB:`, order);

      // Parse and enrich items
      try {
        const items = JSON.parse(order.items || "[]");
        
        // Enrich each item with product details
        const enrichedItems = await Promise.all(items.map(async (item: any) => {
          // Получаем данные о товаре из базы данных
          const product = db.queryOne("SELECT * FROM products WHERE id = ?", [item.id]) as {
            id: number;
            name: string;
            images: string;
            price: number;
            [key: string]: any;
          } | null;
          
          if (product) {
            const productImages = product.images ? JSON.parse(product.images) : [];
            const imageUrl = productImages && productImages.length > 0 ? productImages[0] : null;
            
            // Сохраняем данные о товаре в заказе
            return {
              ...item,
              productName: product.name,
              productImage: imageUrl,
              price: item.price || product.price
            };
          }
          return item;
        }));
        
        // Обновляем items в заказе
        order.items = enrichedItems;
      } catch (error) {
        console.error(`Error processing order ${order.id} items:`, error);
      }

      console.log(`[DEBUG] GET /api/orders/${orderId} - Returning order data:`, order);

      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Ошибка при получении данных заказа" });
    }
  });

  // Маршрут для обновления данных заказа
  app.put("/api/orders/:id", ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
      const orderId = req.params.id;
      const { orderStatus, adminComment, trackingNumber, estimatedDeliveryDate } = req.body;
      
      console.log(`[ORDERS] Запрос на обновление статуса заказа #${orderId}:`, req.body);
      
      // Получаем текущий заказ
      const orderQuery = "SELECT * FROM orders WHERE id = ?";
      const currentOrder = db.queryOne(orderQuery, [orderId]) as Record<string, any>;
      
      if (!currentOrder) {
        return res.status(404).json({ message: "Заказ не найден" });
      }
      
      const prevStatus = currentOrder.order_status || 'unknown';
      console.log(`[ORDERS] Текущий статус заказа #${orderId}: ${prevStatus}`);
      
      // Формируем полный объект обновления с типизацией
      const updateData: Record<string, any> = {};
      
      // Обновляем статус если он передан
      if (orderStatus) {
        updateData.order_status = orderStatus;
        console.log(`[ORDERS] Новый статус заказа: ${orderStatus}`);
      }
      
      // Обновляем комментарий если он передан
      if (adminComment !== undefined) {
        updateData.admin_comment = adminComment;
        console.log(`[ORDERS] Обновлен комментарий админа`);
      }

      // Обновляем трек-номер если он передан
      if (trackingNumber !== undefined) {
        updateData.tracking_number = trackingNumber;
        console.log(`[ORDERS] Обновлен трек-номер: ${trackingNumber}`);
      }

      // Обновляем дату доставки если она передана
      if (estimatedDeliveryDate !== undefined) {
        updateData.estimated_delivery_date = estimatedDeliveryDate;
        console.log(`[ORDERS] Обновлена дата доставки: ${estimatedDeliveryDate}`);
      }
      
      // Добавляем дату обновления
      updateData.updated_at = new Date().toISOString();
      
      // Формируем SQL запрос и параметры
      const fields = Object.keys(updateData).map(key => `${key} = ?`).join(", ");
      const values = Object.values(updateData);
      values.push(orderId); // Добавляем ID для WHERE
      
      // Выполняем запрос на обновление
      db.run(`UPDATE orders SET ${fields} WHERE id = ?`, values);
      
      // Если заказ переходит в статус "оплачен" или "в обработке", уменьшаем количество товаров
      if (orderStatus && 
          (orderStatus === "paid" || orderStatus === "processing") &&
          prevStatus !== "paid" && 
          prevStatus !== "processing") {
        
        console.log(`[ORDERS] Заказ #${orderId} переходит в статус ${orderStatus}, требуется списание товаров`);
        
        try {
          // Получаем товары из заказа
          let items = [];
          
          try {
            // Безопасный парсинг JSON
            const itemsData = String(currentOrder?.items || "[]").trim();
            
            if (itemsData) {
              // Проверяем, является ли строка уже массивом (не строкой JSON)
              if (Array.isArray(currentOrder?.items)) {
                console.log(`[ORDERS] Данные товаров уже являются массивом`);
                items = currentOrder.items;
              } else {
                // Пробуем распарсить JSON
                try {
                  items = JSON.parse(itemsData);
                  
                  // Проверяем, что результат - массив
                  if (!Array.isArray(items)) {
                    console.error(`[ORDERS] Данные товаров после парсинга не являются массивом:`, items);
                    items = [];
                  }
                } catch (parseError) {
                  console.error(`[ORDERS] Ошибка при парсинге товаров:`, parseError, "Данные:", itemsData);
                  
                  // Дополнительная проверка на случай двойного экранирования JSON
                  if (itemsData.startsWith('"[') && itemsData.endsWith(']"')) {
                    try {
                      const unescaped = JSON.parse(itemsData);
                      items = JSON.parse(unescaped);
                      console.log(`[ORDERS] Успешно распарсены вложенные JSON-данные товаров`);
                    } catch (nestedError) {
                      console.error(`[ORDERS] Ошибка при парсинге вложенного JSON:`, nestedError);
                      items = [];
                    }
                  } else {
                    items = [];
                  }
                }
              }
            }
            
            console.log(`[ORDERS] Получены данные товаров:`, items.length > 0 ? `${items.length} позиций` : "нет товаров");
          } catch (error) {
            console.error(`[ORDERS] Критическая ошибка при обработке товаров:`, error);
            items = [];
          }
          
          // Вызываем функцию для списания товаров
          if (items.length > 0) {
            updateProductQuantities(orderId, items);
          } else {
            console.warn(`[ORDERS] Нет товаров для списания в заказе #${orderId}`);
          }
        } catch (error) {
          console.error(`[ORDERS] Ошибка при обработке списания товаров:`, error);
        }
      }
      
      // Получаем обновленный заказ
      const updatedOrder = db.queryOne("SELECT * FROM orders WHERE id = ?", [orderId]);
      
      // Отправляем успешный ответ
      return res.status(200).json({
        success: true,
        message: "Заказ успешно обновлен",
        order: updatedOrder
      });
    } catch (error) {
      console.error(`[ORDERS] Ошибка при обновлении заказа:`, error);
      return res.status(500).json({ 
        success: false,
        message: "Произошла ошибка при обновлении заказа",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Маршрут для удаления заказа
  app.delete("/api/orders/:id", ensureAuthenticated, ensureAdmin, async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = req.params.id;
      
      // Начинаем транзакцию
      db.exec("BEGIN TRANSACTION");
      
      try {
        // Проверяем наличие заказа
        const orderResult = db.queryOne("SELECT * FROM orders WHERE id = ?", [orderId]) as Order | null;
        if (!orderResult) {
          db.exec("ROLLBACK");
          res.status(404).json({ message: `Заказ #${orderId} не найден` });
          return;
        }

        const order = orderResult as Order;

        // Если заказ использовал промокод, удаляем запись об использовании
        if (order.promo_code) {
          db.run(
            "DELETE FROM promo_code_uses WHERE order_id = ?",
            [orderId]
          );
          
          // Уменьшаем счетчик использований промокода
          db.run(
            "UPDATE promo_codes SET current_uses = current_uses - 1 WHERE code = ?",
            [order.promo_code]
          );
        }

        // Если товары были списаны, возвращаем их количество
        if (order.product_quantities_reduced) {
          try {
            const items = JSON.parse(order.items || "[]");
            for (const item of items) {
              if (item.id && item.quantity) {
                db.run(
                  "UPDATE products SET quantity = quantity + ? WHERE id = ?",
                  [item.quantity, item.id]
                );
              }
            }
          } catch (parseError) {
            console.error("Ошибка при возврате товаров:", parseError);
            // Продолжаем удаление заказа даже при ошибке возврата товаров
          }
        }

        // Удаляем заказ
        db.run("DELETE FROM orders WHERE id = ?", [orderId]);
        
        // Подтверждаем транзакцию
        db.exec("COMMIT");
        
        console.log(`Заказ #${orderId} успешно удален`);
        res.json({ success: true, message: `Заказ #${orderId} успешно удален` });
      } catch (transactionError) {
        // В случае ошибки откатываем транзакцию
        db.exec("ROLLBACK");
        throw transactionError;
      }
    } catch (error) {
      console.error("Ошибка при удалении заказа:", error);
      res.status(500).json({ 
        success: false,
        message: "Ошибка при удалении заказа",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Обновление пользователя
  app.put("/api/users/:id", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = req.user as Express.User;
      
      console.log(`[DEBUG] PUT /api/users/${userId} - Incoming body:`, req.body);
      
      // Проверка прав доступа: только админы или сам пользователь могут обновлять профиль
      const isOwnProfile = String(user.id) === String(userId);
      if (!isOwnProfile && !user.isAdmin) {
        return res.status(403).json({ message: "Доступ запрещен" });
      }
      
      // Получаем текущие данные пользователя
      const existingUser = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]) as UserRecord | null;
      if (!existingUser) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }
      
      // Формируем SQL запрос для обновления
      const updateFields = [];
      const updateValues = [];
      
      // Обрабатываем разные поля
      if (req.body.email && req.body.email !== existingUser.email) {
        // Проверка на уникальность email
        const emailExists = db.queryOne("SELECT * FROM users WHERE email = ? AND id != ?", [
          req.body.email.toLowerCase(), userId
        ]);
        
        if (emailExists) {
          return res.status(400).json({ message: "Email уже используется другим пользователем" });
        }
        
        updateFields.push("email = ?");
        updateValues.push(req.body.email.toLowerCase());
      }
      
      // Обновляем все поля, даже если они пустые
      updateFields.push("full_name = ?");
      updateValues.push(req.body.fullName || '');
      
      updateFields.push("phone = ?");
      updateValues.push(req.body.phone || '');
      
      updateFields.push("address = ?");
      updateValues.push(req.body.address || '');
      
      updateFields.push("username = ?");
      updateValues.push(req.body.username || req.body.email || existingUser.email);
      
      // Обработка поля is_admin (только для администраторов)
      if (user.isAdmin && req.body.isAdmin !== undefined) {
        updateFields.push("is_admin = ?");
        updateValues.push(req.body.isAdmin ? 1 : 0);
      }
      
      // Добавляем обновление даты
      updateFields.push("updated_at = ?");
      updateValues.push(new Date().toISOString());
      
      // ID пользователя для WHERE
      updateValues.push(userId);
      
      // Выполняем обновление
      const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
      console.log("[DEBUG] PUT /api/users/:id - Update query:", updateQuery);
      console.log("[DEBUG] PUT /api/users/:id - Update values:", updateValues);
      
      const updateResult = db.run(updateQuery, updateValues);
      console.log("[DEBUG] PUT /api/users/:id - Update result:", updateResult);
      
      // Получаем обновленного пользователя
      const updatedUser = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]) as UserRecord;
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Пользователь не найден после обновления" });
      }
      
      // Форматируем пользователя для ответа и сессии
      const formattedUser = userRecordToSessionUser(updatedUser);
      
      // Если пользователь обновлял свой профиль, обновляем данные в сессии
      if (isOwnProfile) {
        // Полностью обновляем объект пользователя в сессии
        Object.assign(user, formattedUser);
        
        // Принудительно обновляем сессию
        req.session.save((err) => {
          if (err) {
            console.error("Ошибка при сохранении сессии:", err);
          } else {
            console.log("Сессия успешно обновлена для пользователя:", user.email);
          }
        });
      }
      
      // Отправляем обновленные данные пользователя
      res.json({
        id: formattedUser.id,
        email: formattedUser.email,
        username: formattedUser.username,
        fullName: formattedUser.fullName,
        phone: formattedUser.phone,
        address: formattedUser.address,
        isAdmin: formattedUser.isAdmin,
        balance: formattedUser.balance
      });
      
    } catch (error) {
      console.error("Ошибка при обновлении профиля:", error);
      res.status(500).json({ message: "Ошибка сервера при обновлении профиля" });
    }
  });

  // Функция для списания товаров из заказа
  async function updateProductQuantities(orderId: string, items: any[]): Promise<boolean> {
    console.log(`[ORDERS] Списание товаров для заказа #${orderId}`);
    
    if (!orderId) {
      console.error(`[ORDERS] Ошибка: Не указан ID заказа для списания товаров`);
      return false;
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      console.log(`[ORDERS] Нет товаров для списания в заказе #${orderId}`);
      return false;
    }
    
    // Проверяем, существует ли колонка product_quantities_reduced
    try {
      const tableInfo = db.query("PRAGMA table_info(orders)");
      const hasColumn = tableInfo.some((col: any) => col.name === 'product_quantities_reduced');
      
      if (!hasColumn) {
        // Добавляем колонку, если её нет
        console.log(`[ORDERS] Добавление колонки product_quantities_reduced в таблицу orders`);
        try {
          db.exec("ALTER TABLE orders ADD COLUMN product_quantities_reduced INTEGER DEFAULT 0");
        } catch (e) {
          console.error(`[ORDERS] Ошибка при добавлении колонки:`, e);
          // Продолжаем работу даже если не удалось добавить колонку
        }
      }
    } catch (schemaError) {
      console.error(`[ORDERS] Ошибка при проверке схемы:`, schemaError);
    }
    
    // Проверяем, не списаны ли уже товары для этого заказа
    try {
      const orderRecord = db.queryOne(
        "SELECT * FROM orders WHERE id = ?", 
        [orderId]
      ) as Order | null;
      
      if (orderRecord && 
          typeof orderRecord === 'object' && 
          'product_quantities_reduced' in orderRecord && 
          orderRecord.product_quantities_reduced === true) {
        console.log(`[ORDERS] Товары для заказа #${orderId} уже были списаны ранее`);
        return true; // Считаем успешным, так как товары уже списаны
      }
    } catch (checkError) {
      console.error(`[ORDERS] Ошибка при проверке статуса списания:`, checkError);
      // Продолжаем, так как лучше попытаться списать товары, чем не списать
    }
    
    console.log(`[ORDERS] Начинаем списание ${items.length} товаров`);
    
    // Обработка списания в одной транзакции
    try {
      // Начинаем транзакцию
      db.exec("BEGIN TRANSACTION");
      let success = true;
      
      // Обрабатываем каждый товар
      for (const item of items) {
        try {
          if (!item || typeof item !== 'object') {
            console.warn(`[ORDERS] Пропуск невалидного товара:`, item);
            continue;
          }
          
          // Получаем ID товара
          const productId = item.id ? String(item.id) : null;
          if (!productId) {
            console.warn(`[ORDERS] Товар без ID:`, item);
            continue;
          }
          
          // Количество для списания
          let quantity = 0;
          try {
            quantity = parseInt(String(item.quantity || 0));
            if (isNaN(quantity) || quantity <= 0) {
              console.warn(`[ORDERS] Некорректное количество товара:`, item);
              continue;
            }
          } catch (quantityError) {
            console.error(`[ORDERS] Ошибка при обработке количества:`, quantityError);
            continue;
          }
          
          // Получаем текущий товар
          const product = db.queryOne(
            "SELECT * FROM products WHERE id = ?", 
            [productId]
          ) as Product | null;
          
          if (!product) {
            console.warn(`[ORDERS] Товар с ID=${productId} не найден в базе`);
            continue;
          }
          
          // Текущее количество товара
          let currentQuantity = 0;
          try {
            currentQuantity = parseInt(String(product.quantity || 0));
            if (isNaN(currentQuantity)) currentQuantity = 0;
          } catch (parseError) {
            console.error(`[ORDERS] Ошибка при парсинге текущего количества:`, parseError);
            currentQuantity = 0;
          }
          
          // Рассчитываем новое количество (не меньше нуля)
          const newQuantity = Math.max(0, currentQuantity - quantity);
          console.log(`[ORDERS] Обновление количества товара "${product.name}" (ID=${productId}): ${currentQuantity} → ${newQuantity}`);
          
          // Обновляем количество товара
          try {
            const updateResult = db.run(
              "UPDATE products SET quantity = ? WHERE id = ?",
              [newQuantity, productId]
            );
            
            if (!updateResult || updateResult.changes === 0) {
              console.error(`[ORDERS] Не удалось обновить количество товара ID=${productId}`);
              success = false;
            }
          } catch (updateError) {
            console.error(`[ORDERS] Ошибка при обновлении товара:`, updateError);
            success = false;
          }
        } catch (itemError) {
          console.error(`[ORDERS] Ошибка при обработке товара:`, itemError);
          success = false;
        }
      }
      
      // Если все товары обработаны успешно, помечаем заказ
      if (success) {
        try {
          // Помечаем заказ как обработанный
          const markResult = db.run(
            "UPDATE orders SET product_quantities_reduced = 1 WHERE id = ?",
            [orderId]
          );
          
          if (!markResult || markResult.changes === 0) {
            console.warn(`[ORDERS] Не удалось пометить заказ #${orderId} как обработанный`);
          }
          
          // Применяем транзакцию
          db.exec("COMMIT");
          console.log(`[ORDERS] Товары успешно списаны для заказа #${orderId}`);
          return true;
        } catch (markError) {
          console.error(`[ORDERS] Ошибка при обновлении статуса заказа:`, markError);
          db.exec("ROLLBACK");
          return false;
        }
      } else {
        // При ошибках в обработке товаров отменяем транзакцию
        console.error(`[ORDERS] Ошибки при списании товаров, отмена транзакции`);
        db.exec("ROLLBACK");
        return false;
      }
    } catch (transactionError) {
      console.error(`[ORDERS] Критическая ошибка в транзакции:`, transactionError);
      try {
        db.exec("ROLLBACK");
      } catch (rollbackError) {
        console.error(`[ORDERS] Ошибка при отмене транзакции:`, rollbackError);
      }
      return false;
    }
  }

  // Маршрут для обновления статуса заказа
  app.put("/api/orders/:id/status", ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
      const orderId = req.params.id;
      const { orderStatus } = req.body;
      
      if (!orderStatus) {
        return res.status(400).json({ message: "Не указан новый статус заказа" });
      }
      
      console.log(`[ORDERS] Запрос на обновление статуса заказа #${orderId} на ${orderStatus}`);
      
      // Получаем текущий заказ
      const currentOrder = db.queryOne(
        "SELECT * FROM orders WHERE id = ?",
        [orderId]
      ) as Record<string, any> | null;
      
      if (!currentOrder) {
        console.error(`[ORDERS] Заказ #${orderId} не найден`);
        return res.status(404).json({ message: "Заказ не найден" });
      }
      
      // Определяем предыдущий статус
      const previousStatus = currentOrder.order_status || "pending";
      
      console.log(`[ORDERS] Изменение статуса заказа #${orderId}: ${previousStatus} -> ${orderStatus}`);
      
      // Обновляем статус заказа в базе данных
      // Если заказ становится "paid", обновляем также payment_status
      if (orderStatus === "paid") {
        db.run(
          "UPDATE orders SET order_status = ?, payment_status = ?, updated_at = ? WHERE id = ?",
          [orderStatus, "paid", new Date().toISOString(), orderId]
        );
      } else {
        db.run(
          "UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?",
          [orderStatus, new Date().toISOString(), orderId]
        );
      }
      
      // Если заказ переходит в статус "оплачен" или "в обработке", уменьшаем количество товаров
      if ((orderStatus === "paid" || orderStatus === "processing") &&
          (previousStatus !== "paid" && previousStatus !== "processing")) {
        
        console.log(`[ORDERS] Заказ #${orderId} переведен в статус ${orderStatus}, требуется списание товаров`);
        
        try {
          // Получаем товары из заказа
          let items: any[] = [];
          
          try {
            // Обработка различных форматов items
            if (typeof currentOrder.items === 'string') {
              // Безопасный парсинг JSON
              const itemsText = String(currentOrder.items || "[]").trim();
              
              if (itemsText) {
                if (itemsText.startsWith('[') && itemsText.endsWith(']')) {
                  // Стандартный JSON массив
                  items = JSON.parse(itemsText);
                } else if (itemsText.startsWith('"[') && itemsText.endsWith(']"')) {
                  // Случай двойной сериализации
                  const unescaped = JSON.parse(itemsText);
                  items = JSON.parse(unescaped);
                } else {
                  console.error(`[ORDERS] Неизвестный формат items: ${itemsText.substring(0, 50)}...`);
                }
              }
            } else if (Array.isArray(currentOrder.items)) {
              // Если items уже является массивом
              items = currentOrder.items;
            }
          } catch (parseError) {
            console.error(`[ORDERS] Ошибка при парсинге товаров:`, parseError);
            
            // В случае ошибки парсинга, создаем запасной вариант с одним товаром
            if (currentOrder.total_amount) {
              items = [{
                id: 0, // Фиктивный ID
                quantity: 1,
                price: currentOrder.total_amount
              }];
              console.log(`[ORDERS] Создан запасной элемент заказа на сумму ${currentOrder.total_amount}`);
            }
          }
          
          if (items.length === 0) {
            console.log(`[ORDERS] Заказ #${orderId} не содержит товаров для списания`);
          } else {
            // Вызываем функцию для списания товаров
            const success = await updateProductQuantities(orderId, items);
            
            if (success) {
              console.log(`[ORDERS] Товары успешно списаны для заказа #${orderId}`);
            } else {
              console.error(`[ORDERS] Ошибка при списании товаров для заказа #${orderId}`);
            }
          }
        } catch (productError) {
          console.error(`[ORDERS] Ошибка при обработке списания товаров:`, productError);
          // Не прерываем обновление статуса при ошибке списания
        }
      } else {
        console.log(`[ORDERS] Заказ #${orderId} не требует списания товаров при переходе ${previousStatus} -> ${orderStatus}`);
      }
      
      // Возвращаем обновленный заказ
      const updatedOrder = db.queryOne("SELECT * FROM orders WHERE id = ?", [orderId]);
      
      // Send Telegram notification about status change
      try {
        const { telegramService } = await import('./telegram');
        
        // Get user details for notification
        const userRecord = db.queryOne("SELECT email, full_name FROM users WHERE id = ?", [currentOrder.user_id]) as { email: string; full_name: string } | null;
        
        // Parse items for notification
        const parsedItems = JSON.parse(currentOrder.items);
        const itemsWithDetails = parsedItems.map((item: any) => {
          const product = db.queryOne("SELECT name, price FROM products WHERE id = ?", [item.id]) as { name: string; price: number } | null;
          return {
            name: product?.name || 'Неизвестный товар',
            quantity: item.quantity,
            price: product?.price || 0
          };
        });
        
        const telegramOrderData = {
          id: Number(orderId),
          userId: String(currentOrder.user_id),
          userName: userRecord?.full_name || currentOrder.full_name,
          userEmail: userRecord?.email || 'Не указан',
          userPhone: currentOrder.phone,
          totalAmount: currentOrder.total_amount,
          paymentMethod: currentOrder.payment_method,
          deliveryAddress: currentOrder.address,
          items: itemsWithDetails,
          createdAt: currentOrder.created_at
        };
        
        // Send notification for payment status changes
        if (orderStatus === "paid" || orderStatus === "processing") {
          await telegramService.sendPaymentNotification(telegramOrderData, "paid");
        }
      } catch (error) {
        console.error("Error sending Telegram notification:", error);
        // Don't fail the status update if Telegram notification fails
      }

      // Send user notification via Telegram bot about status change
      try {
        const { sendOrderStatusUpdateToUser } = await import('./telegram-bot-final.cjs');
        
        // Parse items for user notification
        const parsedItems = JSON.parse(currentOrder.items || "[]");
        const itemsWithDetails = parsedItems.map((item: any) => {
          const product = db.queryOne("SELECT name, price FROM products WHERE id = ?", [item.id]) as { name: string; price: number } | null;
          return {
            name: product?.name || 'Неизвестный товар',
            quantity: item.quantity,
            price: product?.price || 0
          };
        });
        
        const userOrderData = {
          orderId: String(orderId),
          userName: currentOrder.full_name,
          totalAmount: currentOrder.total_amount,
          paymentMethod: currentOrder.payment_method,
          items: itemsWithDetails,
          status: orderStatus,
          paymentStatus: currentOrder.payment_status
        };
        
        const notificationSent = await sendOrderStatusUpdateToUser(currentOrder.user_id, userOrderData);
        if (notificationSent) {
          console.log(`✅ Уведомление об изменении статуса заказа #${orderId} отправлено пользователю`);
        } else {
          console.log(`📱 Не удалось отправить уведомление об изменении статуса заказа #${orderId} пользователю`);
        }
      } catch (error) {
        console.error("Error sending user status update notification:", error);
        // Don't fail the status update if user notification fails
      }
      
      return res.json({ 
        success: true, 
        message: "Статус заказа успешно обновлен", 
        order: formatOrderForClient(updatedOrder) 
      });
      
    } catch (error) {
      console.error(`[ORDERS] Ошибка при обновлении статуса заказа:`, error);
      res.status(500).json({
        success: false,
        message: "Ошибка сервера при обновлении статуса заказа",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Маршрут для получения заказов пользователя
  app.get("/api/user/orders", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Получаем заказы пользователя из БД
      const orders = db.query(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", 
        [user.id]
      ) as Array<Record<string, any>>;
      
      // Форматируем заказы для клиента
      const formattedOrders = orders.map(order => formatOrderForClient(order));
      
      res.json(formattedOrders);
    } catch (error) {
      console.error("Ошибка при получении заказов пользователя:", error);
      res.status(500).json({ 
        message: "Не удалось загрузить заказы пользователя",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Маршрут для получения отзывов пользователя
  app.get("/api/user/reviews", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Получаем все отзывы пользователя из БД
      const reviews = db.query(
        "SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC", 
        [user.id]
      ) as Array<Record<string, any>>;
      
      // Форматируем отзывы
      const formattedReviews = reviews.map(review => ({
        id: review.id,
        userId: review.user_id,
        productId: review.product_id,
        rating: review.rating,
        text: review.text,
        images: review.images ? JSON.parse(review.images) : [],
        isApproved: review.is_approved === 1,
        createdAt: review.created_at,
      }));
      
      res.json(formattedReviews);
    } catch (error) {
      console.error("Ошибка при получении отзывов пользователя:", error);
      res.status(500).json({
        message: "Не удалось загрузить отзывы пользователя", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Маршрут для получения уведомлений пользователя
  app.get("/api/user/notifications", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Получаем все уведомления пользователя из БД
      const notifications = db.query(
        "SELECT n.*, p.name as product_name, p.image_url FROM notifications n LEFT JOIN products p ON n.product_id = p.id WHERE n.user_id = ? ORDER BY n.created_at DESC", 
        [user.id]
      ) as Array<Record<string, any>>;
      
      // Форматируем уведомления
      const formattedNotifications = notifications.map(notification => ({
        id: notification.id,
        userId: notification.user_id,
        productId: notification.product_id,
        type: notification.type,
        seen: notification.seen === 1,
        product: notification.product_name ? {
          id: notification.product_id,
          name: notification.product_name,
          imageUrl: notification.image_url
        } : null,
        createdAt: notification.created_at,
      }));
      
      res.json(formattedNotifications);
    } catch (error) {
      console.error("Ошибка при получении уведомлений пользователя:", error);
      res.status(500).json({ 
        message: "Не удалось загрузить уведомления пользователя",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ИСПРАВЛЕННАЯ регистрация пользователя - только в pending_registrations
  // ПРИМЕЧАНИЕ: Регистрация перенесена в auth-sqlite.ts для единой логики

  // ENDPOINT РЕГИСТРАЦИИ ПОЛЬЗОВАТЕЛЯ
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
        password: hashPassword(password), // ХЕШИРУЕМ ПАРОЛЬ СРАЗУ!
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

      console.log(`📝 Новая регистрация сохранена:`);
      console.log(`   Email: ${email}`);
      console.log(`   Телефон: ${phone}`);
      console.log(`   Токен: ${verificationToken}`);

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

  // Маршрут для генерации чека заказа
  app.post("/api/orders/:id/receipt", ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
      const orderId = req.params.id;
      
      // Получаем заказ
      const order = db.queryOne("SELECT * FROM orders WHERE id = ?", [orderId]) as Record<string, any>;
      if (!order) {
        return res.status(404).json({ message: "Заказ не найден" });
      }

      // Генерируем уникальный номер чека
      const receiptNumber = `CHK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Формируем данные для чека
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      const receiptData = {
        receiptNumber,
        orderId: order.id,
        date: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
        customer: {
          name: order.full_name,
          phone: order.phone,
          address: order.address
        },
        items: items.map((item: any) => ({
          name: item.productName || item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: parseFloat(order.total_amount),
        delivery: parseFloat(order.delivery_amount),
        total: parseFloat(order.total_amount) + parseFloat(order.delivery_amount),
        paymentMethod: order.payment_method,
        deliveryType: order.delivery_type
      };

      // Создаем директорию для чеков, если её нет
      const receiptsDir = path.join(process.cwd(), 'public', 'receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      // Генерируем PDF чек
      const receiptFileName = `${receiptNumber}.pdf`;
      const receiptPath = path.join(receiptsDir, receiptFileName);
      await generateReceiptPDF(receiptData, receiptPath);

      // Обновляем информацию о чеке в базе данных
      const receiptGeneratedAt = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
      const receiptUrl = `/receipts/${receiptFileName}`; // Используем относительный путь
      
      console.log(`[RECEIPT] Генерация чека для заказа #${orderId}:`);
      console.log(`[RECEIPT] Путь к файлу: ${receiptPath}`);
      console.log(`[RECEIPT] URL для доступа: ${receiptUrl}`);

      db.run(
        `UPDATE orders SET 
          receipt_number = ?,
          receipt_url = ?,
          receipt_generated_at = ?
        WHERE id = ?`,
        [
          receiptNumber,
          receiptUrl,
          receiptGeneratedAt,
          orderId
        ]
      );

      res.json({
        receiptNumber,
        receiptUrl,
        receiptGeneratedAt
      });
    } catch (error) {
      console.error("Ошибка при генерации чека:", error);
      res.status(500).json({ message: "Ошибка при генерации чека" });
    }
  });

  // Функция для генерации PDF чека
  async function generateReceiptPDF(receiptData: any, outputPath: string) {
    // Создаем директорию для чеков, если её нет
    const receiptsDir = path.dirname(outputPath);
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    // Настройки макета чека
    const layoutSettings = {
      // Основные размеры и отступы
      page: {
        margin: 50,
        width: 595.28, // A4 ширина в пунктах
        height: 841.89 // A4 высота в пунктах
      },
      fonts: {
        title: { size: 24, family: 'Arial' },
        subtitle: { size: 16, family: 'Arial' },
        header: { size: 14, family: 'Arial' },
        normal: { size: 12, family: 'Arial' },
        small: { size: 10, family: 'Arial' },
        tiny: { size: 8, family: 'Arial' }
      },
      spacing: {
        lineHeight: 12,
        itemPadding: 4,
        sectionPadding: 8,
        minItemHeight: 16
      },
      table: {
        // Настройки ширины колонок (в процентах от общей ширины таблицы)
        columnWidths: {
          name: 0.35,     // 35% для названия (уменьшено для лучшей читаемости)
          category: 0.25,  // 25% для категории (увеличено)
          quantity: 0.10,  // 10% для количества
          price: 0.15,     // 15% для цены
          total: 0.15      // 15% для суммы
        },
        // Максимальное количество строк для названия товара
        maxNameLines: 3,
        // Максимальное количество строк для категории
        maxCategoryLines: 2,
        // Отступ для многострочного текста
        textIndent: 2
      },
      colors: {
        text: '#000000',
        header: '#333333',
        border: '#CCCCCC',
        highlight: '#666666'
      }
    };

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: layoutSettings.page.margin,
          bufferPages: true
        });

        // Путь к шрифту Arial
        const fontPath = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
        
        // Проверяем существование шрифта
        if (!fs.existsSync(fontPath)) {
          throw new Error('Шрифт Arial не найден. Пожалуйста, запустите setup-fonts.js');
        }

        // Регистрируем шрифт с поддержкой кириллицы
        doc.registerFont('Arial', fontPath);

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Устанавливаем шрифт с поддержкой кириллицы по умолчанию
        doc.font(layoutSettings.fonts.normal.family);

        // Заголовок магазина
        doc.fontSize(layoutSettings.fonts.title.size)
           .fillColor(layoutSettings.colors.header)
           .text('Jungle Plants', { align: 'center' });
      
        doc.fontSize(layoutSettings.fonts.subtitle.size)
           .text('Чек заказа', { align: 'center' });
      
        doc.moveDown(1);

        // Информация о заказе и дата
        doc.fontSize(12);
        // Форматируем дату правильно
        let formattedDate;
        try {
          // Пробуем распарсить дату, если она в строковом формате
          const date = typeof receiptData.date === 'string' 
            ? new Date(receiptData.date)
            : receiptData.date;

          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }

          formattedDate = date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Moscow'
          });
        } catch (error) {
          console.error('Ошибка форматирования даты:', error);
          formattedDate = new Date().toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Moscow'
          });
        }
        doc.text(`Номер чека: ${receiptData.receiptNumber}`, { align: 'right' });
        doc.text(`Номер заказа: ${receiptData.orderId}`, { align: 'right' });
        doc.text(`Дата: ${formattedDate}`, { align: 'right' });
        doc.moveDown(1.5);

        // Информация о клиенте
        doc.fontSize(14).text('Информация о клиенте:', { underline: true });
        doc.fontSize(12);
        doc.text(`Имя: ${receiptData.customer.name || ''}`);
        doc.text(`Телефон: ${receiptData.customer.phone || ''}`);
        doc.text(`Адрес: ${receiptData.customer.address || ''}`);
        doc.moveDown(1.5);

        // Товары
        doc.fontSize(14).text('Товары:', { underline: true });
        doc.moveDown(0.5);

        // Таблица товаров
        const tableTop = doc.y;
        const tableLeft = 50;
        const tableWidth = doc.page.width - 100;
        const colWidths = {
          name: tableWidth * 0.4,    // 40% для названия
          category: tableWidth * 0.2, // 20% для категории
          quantity: tableWidth * 0.1, // 10% для количества
          price: tableWidth * 0.15,   // 15% для цены
          total: tableWidth * 0.15    // 15% для суммы
        };

        // Заголовки таблицы
        doc.fontSize(11).text('Наименование', tableLeft, doc.y, { width: colWidths.name });
        doc.text('Категория', tableLeft + colWidths.name, doc.y, { width: colWidths.category });
        doc.text('Кол-во', tableLeft + colWidths.name + colWidths.category, doc.y, { width: colWidths.quantity, align: 'center' });
        doc.text('Цена', tableLeft + colWidths.name + colWidths.category + colWidths.quantity, doc.y, { width: colWidths.price, align: 'right' });
        doc.text('Сумма', tableLeft + colWidths.name + colWidths.category + colWidths.quantity + colWidths.price, doc.y, { width: colWidths.total, align: 'right' });
        doc.moveDown(0.5);

        // Линия под заголовками
        doc.moveTo(tableLeft, doc.y - 2)
           .lineTo(tableLeft + tableWidth, doc.y - 2)
           .stroke();
        doc.moveDown(0.5);

        // Товары
        let y = doc.y; // Начальная Y координата для первого товара

        receiptData.items.forEach((item: any, index: number) => {
          // Проверяем, нужно ли добавить новую страницу
          // Учитываем высоту заголовков таблицы и итогов
          const headerHeight = 40; // Высота заголовков таблицы
          const footerHeight = 150; // Высота итогов и подписи
          const estimatedItemHeight = layoutSettings.spacing.minItemHeight * 2; // Увеличиваем оценку высоты элемента

          if (y + estimatedItemHeight > doc.page.height - (headerHeight + footerHeight)) {
            doc.addPage();
            y = layoutSettings.page.margin;
            
            // Перерисовываем заголовки на новой странице
            doc.fontSize(layoutSettings.fonts.small.size)
               .fillColor(layoutSettings.colors.header);
            
            const headerY = y;
            doc.text('Наименование', tableLeft, headerY, { width: layoutSettings.table.columnWidths.name });
            doc.text('Категория', tableLeft + layoutSettings.table.columnWidths.name, headerY, { width: layoutSettings.table.columnWidths.category });
            doc.text('Кол-во', tableLeft + layoutSettings.table.columnWidths.name + layoutSettings.table.columnWidths.category, headerY, { 
              width: layoutSettings.table.columnWidths.quantity, 
              align: 'center' 
            });
            doc.text('Цена', tableLeft + layoutSettings.table.columnWidths.name + layoutSettings.table.columnWidths.category + layoutSettings.table.columnWidths.quantity, headerY, { 
              width: layoutSettings.table.columnWidths.price, 
              align: 'right' 
            });
            doc.text('Сумма', tableLeft + layoutSettings.table.columnWidths.name + layoutSettings.table.columnWidths.category + layoutSettings.table.columnWidths.quantity + layoutSettings.table.columnWidths.price, headerY, { 
              width: layoutSettings.table.columnWidths.total, 
              align: 'right' 
            });
            
            // Линия под заголовками
            const headerBottomY = headerY + layoutSettings.spacing.lineHeight + layoutSettings.spacing.itemPadding;
            doc.strokeColor(layoutSettings.colors.border)
               .moveTo(tableLeft, headerBottomY)
               .lineTo(tableLeft + layoutSettings.page.width - layoutSettings.page.margin * 2, headerBottomY)
               .stroke();
            
            y = headerBottomY + layoutSettings.spacing.itemPadding; // Обновляем Y после заголовков
          }

          const name = item.productName || item.name || '';
          const category = item.category || 'Растение';
          const quantity = parseInt(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          const total = quantity * price;

          // Обработка длинного названия товара
          doc.fontSize(layoutSettings.fonts.small.size);
          const nameOptions = {
            width: layoutSettings.table.columnWidths.name - layoutSettings.table.textIndent,
            align: 'left' as const,
            continued: false,
            ellipsis: '...' // Добавляем многоточие для обрезанного текста
          };

          // Проверяем, сколько строк займет название
          const nameHeight = doc.heightOfString(name, nameOptions);
          const maxNameHeight = layoutSettings.spacing.lineHeight * layoutSettings.table.maxNameLines;
          
          // Если название слишком длинное, обрезаем его
          let displayName = name;
          if (nameHeight > maxNameHeight) {
            // Находим позицию, где нужно обрезать текст
            let cutPosition = name.length;
            while (doc.heightOfString(name.substring(0, cutPosition) + '...', nameOptions) > maxNameHeight && cutPosition > 0) {
              cutPosition = Math.floor(cutPosition * 0.9); // Уменьшаем длину на 10%
            }
            displayName = name.substring(0, cutPosition) + '...';
          }

          // Аналогичная обработка для категории
          const categoryOptions = {
            width: layoutSettings.table.columnWidths.category - layoutSettings.table.textIndent,
            align: 'left' as const,
            continued: false,
            ellipsis: '...'
          };

          const categoryHeight = doc.heightOfString(category, categoryOptions);
          const maxCategoryHeight = layoutSettings.spacing.lineHeight * layoutSettings.table.maxCategoryLines;
          
          let displayCategory = category;
          if (categoryHeight > maxCategoryHeight) {
            let cutPosition = category.length;
            while (doc.heightOfString(category.substring(0, cutPosition) + '...', categoryOptions) > maxCategoryHeight && cutPosition > 0) {
              cutPosition = Math.floor(cutPosition * 0.9);
            }
            displayCategory = category.substring(0, cutPosition) + '...';
          }

          // Рассчитываем высоту для каждой колонки
          const quantityHeight = doc.heightOfString(quantity.toString(), { width: layoutSettings.table.columnWidths.quantity });
          const priceHeight = doc.heightOfString(`${price.toLocaleString('ru-RU')} ₽`, { width: layoutSettings.table.columnWidths.price });
          const totalHeight = doc.heightOfString(`${total.toLocaleString('ru-RU')} ₽`, { width: layoutSettings.table.columnWidths.total });

          // Находим максимальную высоту для строки
          const rowHeight = Math.max(
            doc.heightOfString(displayName, nameOptions),
            doc.heightOfString(displayCategory, categoryOptions),
            quantityHeight,
            priceHeight,
            totalHeight,
            layoutSettings.spacing.minItemHeight
          ) + layoutSettings.spacing.itemPadding * 2;

          // Выводим данные товара с правильным вертикальным выравниванием
          const itemY = y + layoutSettings.spacing.itemPadding;
          const verticalCenter = itemY + (rowHeight - layoutSettings.spacing.itemPadding * 2) / 2;

          // Наименование (с переносом строк и обрезкой)
          doc.fillColor(layoutSettings.colors.text)
             .text(displayName, tableLeft, itemY, nameOptions);

          // Категория (с переносом строк и обрезкой)
          doc.text(displayCategory, tableLeft + layoutSettings.table.columnWidths.name, itemY, categoryOptions);

          // Количество (по центру)
          const quantityY = verticalCenter - quantityHeight / 2;
          doc.text(quantity.toString(), tableLeft + layoutSettings.table.columnWidths.name + layoutSettings.table.columnWidths.category, quantityY, {
            width: layoutSettings.table.columnWidths.quantity,
            align: 'center'
          });

          // Цена (по правому краю)
          const priceY = verticalCenter - priceHeight / 2;
          doc.text(`${price.toLocaleString('ru-RU')} ₽`, tableLeft + layoutSettings.table.columnWidths.name + layoutSettings.table.columnWidths.category + layoutSettings.table.columnWidths.quantity, priceY, {
            width: layoutSettings.table.columnWidths.price,
            align: 'right'
          });

          // Сумма (по правому краю)
          const totalY = verticalCenter - totalHeight / 2;
          doc.text(`${total.toLocaleString('ru-RU')} ₽`, tableLeft + layoutSettings.table.columnWidths.name + layoutSettings.table.columnWidths.category + layoutSettings.table.columnWidths.quantity + layoutSettings.table.columnWidths.price, totalY, {
            width: layoutSettings.table.columnWidths.total,
            align: 'right'
          });

          // Дополнительная информация
          const details = [];
          if (item.hasOwnProperty('isRare') && item.isRare) details.push('Редкое растение');
          if (item.hasOwnProperty('isPreorder') && item.isPreorder) details.push('Предзаказ');
          if (item.hasOwnProperty('isEasyToCare') && item.isEasyToCare) details.push('Простой уход');

          let detailsHeight = 0;
          if (details.length > 0) {
            doc.fontSize(layoutSettings.fonts.tiny.size)
               .fillColor(layoutSettings.colors.highlight);
            
            const detailsText = `(${details.join(', ')})`;
            const detailsY = itemY + rowHeight - layoutSettings.spacing.itemPadding;
            doc.text(detailsText, tableLeft, detailsY, {
              width: layoutSettings.page.width - layoutSettings.page.margin * 2 - layoutSettings.table.textIndent,
              continued: false
            });
            detailsHeight = doc.heightOfString(detailsText, { width: layoutSettings.page.width - layoutSettings.page.margin * 2 - layoutSettings.table.textIndent }) + layoutSettings.spacing.itemPadding;
          }

          // Обновляем Y координату для следующего элемента
          y = itemY + rowHeight + detailsHeight;

          // Добавляем разделительную линию между товарами
          doc.strokeColor(layoutSettings.colors.border)
             .moveTo(tableLeft, y - layoutSettings.spacing.itemPadding)
             .lineTo(tableLeft + layoutSettings.page.width - layoutSettings.page.margin * 2, y - layoutSettings.spacing.itemPadding)
             .stroke();
        });

        // Линия после товаров
        doc.moveTo(tableLeft, y - 2) 
           .lineTo(tableLeft + layoutSettings.page.width - layoutSettings.page.margin * 2, y - 2)
           .stroke();

        doc.moveDown(1.5); 

        // Итоги
        const subtotal = parseFloat(receiptData.subtotal) || 0;
        const delivery = parseFloat(receiptData.delivery) || 0;
        const total = subtotal + delivery;

        doc.fontSize(layoutSettings.fonts.normal.size);
        // Выравниваем подытог и доставку по правому краю
        const totalsX = layoutSettings.page.width - layoutSettings.page.margin * 2 - layoutSettings.table.columnWidths.total; // Позиция для итогов (60% от ширины таблицы)
        const totalsWidth = layoutSettings.table.columnWidths.total; // Ширина колонки для итогов

        doc.text(`Подытог: ${subtotal.toLocaleString('ru-RU')} ₽`, totalsX, doc.y, { align: 'right', width: totalsWidth });
        doc.text(`Доставка: ${delivery.toLocaleString('ru-RU')} ₽`, totalsX, doc.y, { align: 'right', width: totalsWidth });
        doc.fontSize(layoutSettings.fonts.normal.size);
        doc.text(`Итого: ${total.toLocaleString('ru-RU')} ₽`, totalsX, doc.y, { align: 'right', width: totalsWidth });
        doc.moveDown(2);

        // Информация об оплате и доставке
        doc.fontSize(layoutSettings.fonts.small.size);
        const paymentMethodMap: Record<string, string> = {
          "ozonpay": "Онлайн оплата",
          "directTransfer": "Прямой перевод",
          "balance": "Баланс"
        };
        const deliveryTypeMap: Record<string, string> = {
          "cdek": "СДЭК",
          "russianPost": "Почта России",
          "pickup": "Самовывоз"
        };
        // Выводим способы оплаты и доставки
        doc.text(`Способ оплаты: ${paymentMethodMap[receiptData.paymentMethod] || receiptData.paymentMethod}`);
        doc.text(`Способ доставки: ${deliveryTypeMap[receiptData.deliveryType] || receiptData.deliveryType}`);
        doc.moveDown(3); 

        // Подпись
        doc.fontSize(layoutSettings.fonts.normal.size).text('Спасибо за покупку!', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(layoutSettings.fonts.normal.size).text('Jungle Plants', { align: 'center' });
        doc.fontSize(layoutSettings.fonts.small.size).text('Магазин комнатных растений', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(layoutSettings.fonts.tiny.size).text('www.jungleplants.ru', { align: 'center' });

        // Добавляем QR-код для проверки подлинности чека
        const qrCodePath = path.join(process.cwd(), 'public', 'receipts', `${receiptData.receiptNumber}.png`);
        if (fs.existsSync(qrCodePath)) {
          const qrSize = 100;
          const qrX = doc.page.width - qrSize - 50;
          const qrY = doc.page.height - qrSize - 50;
          // Проверяем, чтобы QR-код не накладывался на текст в конце страницы
          if (qrY > doc.y + 20) { 
             doc.image(qrCodePath, qrX, qrY, { width: qrSize });
             doc.fontSize(layoutSettings.fonts.tiny.size).text('QR-код для проверки подлинности', qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });
          }
        }

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', (err) => {
          console.error('Ошибка при записи PDF:', err);
          reject(err);
        });
      } catch (error) {
        console.error('Ошибка при генерации PDF:', error);
        reject(error);
      }
    });
  }

  // Добавляем обработчик смены пароля
  app.put("/api/users/:id/password", async (req, res) => {
    try {
      const userId = req.params.id;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ 
          message: "Необходимо указать текущий и новый пароль" 
        });
      }

      // Получаем пользователя
      const user = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]) as UserRecord | null;
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Проверяем текущий пароль
      const isPasswordValid = comparePasswords(user.password, oldPassword);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Неверный текущий пароль" });
      }

      // Проверяем новый пароль
      if (newPassword.length < 8) {
        return res.status(400).json({ 
          message: "Новый пароль должен быть не менее 8 символов" 
        });
      }

      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ 
          message: "Новый пароль должен содержать хотя бы одну заглавную букву" 
        });
      }

      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ 
          message: "Новый пароль должен содержать хотя бы одну цифру" 
        });
      }

      // Хешируем новый пароль
      const hashedPassword = hashPassword(newPassword);

      // Обновляем пароль в базе данных
      db.run(
        "UPDATE users SET password = ?, updated_at = ? WHERE id = ?",
        [hashedPassword, new Date().toISOString(), userId]
      );

      res.json({ message: "Пароль успешно изменен" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Endpoint для удаления аккаунта пользователя
  app.delete("/api/users/:id/account", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const { password } = req.body;
      const currentUser = req.user as any;

      // Проверяем, что пользователь удаляет свой собственный аккаунт
      if (currentUser.id !== userId) {
        return res.status(403).json({ 
          message: "Вы можете удалить только свой собственный аккаунт" 
        });
      }

      if (!password) {
        return res.status(400).json({ 
          message: "Необходимо подтвердить удаление паролем" 
        });
      }

      // Получаем пользователя
      const user = db.queryOne("SELECT * FROM users WHERE id = ?", [userId]) as UserRecord | null;
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Проверяем пароль
      const isPasswordValid = comparePasswords(user.password, password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Неверный пароль" });
      }

      console.log(`🗑️ Начинаем удаление аккаунта пользователя ${user.email} (ID: ${userId})`);

      // Удаляем связанные данные
      try {
        // 1. Удаляем отзывы пользователя
        const reviewsResult = db.run("DELETE FROM reviews WHERE user_id = ?", [userId]);
        console.log(`✅ Удалено отзывов: ${reviewsResult.changes}`);

        // 2. Удаляем заказы пользователя (осторожно - это может повлиять на статистику)
        const ordersResult = db.run("DELETE FROM orders WHERE user_id = ?", [userId]);
        console.log(`✅ Удалено заказов: ${ordersResult.changes}`);

        // 3. Удаляем уведомления пользователя
        const notificationsResult = db.run("DELETE FROM notifications WHERE user_id = ?", [userId]);
        console.log(`✅ Удалено уведомлений: ${notificationsResult.changes}`);

        // 4. Удаляем записи из pending_registrations по телефону
        if (user.phone) {
          const pendingResult = db.run("DELETE FROM pending_registrations WHERE phone = ?", [user.phone]);
          console.log(`✅ Удалено pending_registrations: ${pendingResult.changes}`);
        }

        // 5. Удаляем самого пользователя
        const userResult = db.run("DELETE FROM users WHERE id = ?", [userId]);
        console.log(`✅ Удален пользователь: ${userResult.changes}`);

        // Завершаем сессию
        req.logout((err) => {
          if (err) {
            console.error("Ошибка при завершении сессии:", err);
          }
        });

        console.log(`🎉 Аккаунт ${user.email} успешно удален`);
        res.json({ 
          message: "Аккаунт успешно удален",
          deleted: {
            reviews: reviewsResult.changes,
            orders: ordersResult.changes,
            notifications: notificationsResult.changes
          }
        });

      } catch (deleteError) {
        console.error("Ошибка при удалении связанных данных:", deleteError);
        res.status(500).json({ 
          message: "Ошибка при удалении данных аккаунта" 
        });
      }

    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Ошибка при удалении аккаунта" });
    }
  });

  app.get("/api/debug/user-count", async (req, res) => {
    try {
      const count = db.queryOne("SELECT COUNT(*) as userCount FROM users");
      res.json({ userCount: count ? (count as any).userCount : 0 });
    } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ message: "Failed to fetch user count" });
    }
  });

  // Схема для валидации промокода
  const validatePromoCodeSchema = z.object({
    code: z.string().min(1),
    cartTotal: z.number().min(0)
  });

  // Схема для создания/обновления промокода
  const promoCodeSchema = z.object({
    code: z.string().min(1, "Введите код промокода"),
    description: z.string().optional(),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.number().min(0, "Значение скидки должно быть положительным"),
    minOrderAmount: z.number().min(0, "Минимальная сумма заказа должна быть положительной").optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    maxUses: z.number().min(1, "Максимальное количество использований должно быть положительным").optional(),
    isActive: z.boolean().default(true),
  });

  // Типы для промокодов
  interface PromoCode {
    id: number;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number | null;
    start_date: string;
    end_date: string;
    max_uses: number | null;
    current_uses: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  interface Order {
    id: string;
    user_id: number;
    total_amount: number;
    delivery_amount: number;
    promo_code: string | null;
    promo_code_discount: number | null;
    items: string;
    full_name: string;
    address: string;
    phone: string;
    social_network?: string;
    social_username?: string;
    comment?: string;
    need_insulation: boolean;
    delivery_type: string;
    delivery_speed?: string;
    payment_method: string;
    payment_status: string;
    order_status: string;
    payment_proof_url?: string;
    admin_comment?: string;
    tracking_number?: string;
    estimated_delivery_date?: string;
    actual_delivery_date?: string;
    last_status_change_at?: string;
    status_history?: string;
    product_quantities_reduced: boolean;
    created_at: string;
    updated_at: string;
  }

  // API для валидации промокода
  app.post("/api/promo-codes/validate", async (req, res) => {
    try {
      const { code, cartTotal } = validatePromoCodeSchema.parse(req.body);
      
      const promoCode = db.queryOne(`
        SELECT * FROM promo_codes 
        WHERE code = ? 
        AND is_active = 1 
        AND start_date <= datetime('now') 
        AND end_date >= datetime('now')
        AND (max_uses IS NULL OR current_uses < max_uses)
      `, [code.toUpperCase()]) as PromoCode | undefined;

      if (!promoCode) {
        return res.status(404).json({ 
          message: "Промокод не найден или недействителен" 
        });
      }

      if (promoCode.min_order_amount && cartTotal < promoCode.min_order_amount) {
        return res.status(400).json({ 
          message: `Минимальная сумма заказа для применения промокода: ${promoCode.min_order_amount} ₽` 
        });
      }

      let discount = 0;
      if (promoCode.discount_type === "percentage") {
        discount = Math.round(cartTotal * (promoCode.discount_value / 100));
      } else {
        discount = promoCode.discount_value;
      }

      discount = Math.min(discount, cartTotal);

      return res.json({
        code: promoCode.code,
        description: promoCode.description,
        discount,
        discountType: promoCode.discount_type,
        discountValue: promoCode.discount_value
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Неверные данные", 
          errors: error.errors 
        });
      }
      console.error("Ошибка при валидации промокода:", error);
      return res.status(500).json({ 
        message: "Ошибка при проверке промокода" 
      });
    }
  });

  // API для получения списка промокодов (только для админов)
  app.get("/api/promo-codes", ensureAdmin, async (req, res) => {
    try {
      const promoCodes = db.query("SELECT * FROM promo_codes ORDER BY created_at DESC");
      res.json(promoCodes);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // API для получения конкретного промокода (только для админов)
  app.get("/api/promo-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const promoCode = db.queryOne(
        "SELECT * FROM promo_codes WHERE id = ?",
        [id]
      ) as PromoCode | null;
      
      if (!promoCode) {
        return res.status(404).json({ 
          message: "Промокод не найден" 
        });
      }
      
      res.json(promoCode);
    } catch (error) {
      console.error("Error fetching promo code:", error);
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // API для создания промокода (только для админов)
  app.post("/api/promo-codes", ensureAdmin, async (req, res) => {
    try {
      const data = promoCodeSchema.parse(req.body);
      
      // Проверяем, что код уникален
      const existingCode = db.queryOne(
        "SELECT id FROM promo_codes WHERE code = ?",
        [data.code.toUpperCase()]
      );
      
      if (existingCode) {
        return res.status(400).json({ 
          message: "Промокод с таким кодом уже существует" 
        });
      }
      
      // Создаем промокод
      const result = db.run(
        `INSERT INTO promo_codes (
          code, description, discount_type, discount_value,
          min_order_amount, start_date, end_date, max_uses,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          data.code.toUpperCase(),
          data.description || null,
          data.discountType,
          data.discountValue,
          data.minOrderAmount || null,
          data.startDate,
          data.endDate,
          data.maxUses || null,
          data.isActive ? 1 : 0
        ]
      );
      
      const newPromoCode = db.queryOne(
        "SELECT * FROM promo_codes WHERE id = ?",
        [result.lastInsertRowid]
      );
      
      res.status(201).json(newPromoCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Неверные данные", 
          errors: error.errors 
        });
      }
      console.error("Error creating promo code:", error);
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // API для обновления промокода (только для админов)
  app.put("/api/promo-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = promoCodeSchema.parse(req.body);
      
      // Проверяем существование промокода
      const existingPromoCode = db.queryOne(
        "SELECT id FROM promo_codes WHERE id = ?",
        [id]
      );
      
      if (!existingPromoCode) {
        return res.status(404).json({ 
          message: "Промокод не найден" 
        });
      }
      
      // Проверяем уникальность кода
      const duplicateCode = db.queryOne(
        "SELECT id FROM promo_codes WHERE code = ? AND id != ?",
        [data.code.toUpperCase(), id]
      );
      
      if (duplicateCode) {
        return res.status(400).json({ 
          message: "Промокод с таким кодом уже существует" 
        });
      }
      
      // Обновляем промокод
      db.run(
        `UPDATE promo_codes SET
          code = ?,
          description = ?,
          discount_type = ?,
          discount_value = ?,
          min_order_amount = ?,
          start_date = ?,
          end_date = ?,
          max_uses = ?,
          is_active = ?,
          updated_at = datetime('now')
        WHERE id = ?`,
        [
          data.code.toUpperCase(),
          data.description || null,
          data.discountType,
          data.discountValue,
          data.minOrderAmount || null,
          data.startDate,
          data.endDate,
          data.maxUses || null,
          data.isActive ? 1 : 0,
          id
        ]
      );
      
      const updatedPromoCode = db.queryOne(
        "SELECT * FROM promo_codes WHERE id = ?",
        [id]
      );
      
      res.json(updatedPromoCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Неверные данные", 
          errors: error.errors 
        });
      }
      console.error("Error updating promo code:", error);
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // API для удаления промокода (только для админов)
  app.delete("/api/promo-codes/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Проверяем существование промокода
      const existingPromoCode = db.queryOne(
        "SELECT id FROM promo_codes WHERE id = ?",
        [id]
      );
      
      if (!existingPromoCode) {
        return res.status(404).json({ 
          message: "Промокод не найден" 
        });
      }
      
      // Удаляем промокод
      db.run("DELETE FROM promo_codes WHERE id = ?", [id]);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // Применение промокода к заказу
  app.post("/api/orders/:orderId/apply-promo", ensureAuthenticated, async (req, res) => {
    const { orderId } = req.params;
    const { promoCode } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    try {
      // Получаем заказ
      const order = db.queryOne(
        "SELECT * FROM orders WHERE id = ?",
        [orderId]
      ) as Order | null;

      if (!order) {
        return res.status(404).json({ message: "Заказ не найден" });
      }

      // Получаем промокод
      const promo = db.queryOne(
        "SELECT * FROM promo_codes WHERE code = ? AND (expires_at IS NULL OR expires_at > datetime('now')) AND is_active = 1",
        [promoCode]
      ) as PromoCode | null;

      if (!promo) {
        return res.status(400).json({ message: "Недействительный промокод" });
      }

      // Проверяем минимальную сумму заказа
      if (promo.min_order_amount && order.total_amount < promo.min_order_amount) {
        return res.status(400).json({ 
          message: `Минимальная сумма заказа для этого промокода: ${promo.min_order_amount} ₽` 
        });
      }

      // Проверяем лимит использований
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        return res.status(400).json({ message: "Достигнут лимит использований промокода" });
      }

      // Проверяем, не использовал ли пользователь этот промокод ранее
      const userUsage = db.queryOne(
        `SELECT id FROM promo_code_uses 
         WHERE promo_code_id = ? AND user_id = ?`,
        [promo.id, userId]
      );

      if (userUsage) {
        return res.status(400).json({ message: "Вы уже использовали этот промокод" });
      }

      // Рассчитываем скидку
      let discountAmount = 0;
      if (promo.discount_type === "percentage") {
        // Применяем скидку только к стоимости товаров, без доставки
        const itemsTotal = order.total_amount - order.delivery_amount;
        discountAmount = Math.round(itemsTotal * (promo.discount_value / 100));
      } else {
        discountAmount = promo.discount_value;
      }

      // Проверяем, что скидка не превышает стоимость товаров
      const itemsTotal = order.total_amount - order.delivery_amount;
      discountAmount = Math.min(discountAmount, itemsTotal);

      // Начинаем транзакцию
      db.exec("BEGIN TRANSACTION");

      try {
        // Обновляем заказ
        db.run(
          `UPDATE orders 
           SET promo_code = ?,
               promo_code_discount = ?,
               total_amount = total_amount - ?
           WHERE id = ?`,
          [promo.code, discountAmount, discountAmount, orderId]
        );

        // Увеличиваем счетчик использований промокода
        db.run(
          `UPDATE promo_codes 
           SET current_uses = current_uses + 1 
           WHERE id = ?`,
          [promo.id]
        );

        // Записываем использование промокода пользователем
        db.run(
          `INSERT INTO promo_code_uses (promo_code_id, user_id, order_id, discount_amount, used_at)
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [promo.id, userId, orderId, discountAmount]
        );

        // Завершаем транзакцию
        db.exec("COMMIT");

        // Получаем обновленный заказ
        const updatedOrder = db.queryOne(
          `SELECT * FROM orders WHERE id = ?`,
          [orderId]
        );

        if (!updatedOrder) {
          throw new Error("Заказ не найден после обновления");
        }

        res.json(formatOrderForClient(updatedOrder));
      } catch (error) {
        // Откатываем транзакцию в случае ошибки
        db.exec("ROLLBACK");
        console.error("Error updating promo code:", error);
        res.status(500).json({ message: "Ошибка при обновлении промокода" });
      }
    } catch (error) {
      console.error("Error applying promo code:", error);
      res.status(500).json({ message: "Ошибка при применении промокода" });
    }
  });

  // Эндпоинт для запроса подтверждения телефона
  app.post("/api/auth/request-phone-verification", async (req, res) => {
    try {
      const { phone, userData, verificationToken } = req.body;
      
      console.log(`📋 Запрос верификации телефона: ${phone} с токеном: ${verificationToken}`);
      console.log(`📋 Данные пользователя:`, userData);
      
      if (!phone || !userData || !verificationToken) {
        return res.status(400).json({ 
          error: "Отсутствуют обязательные поля: phone, userData, verificationToken" 
        });
      }

      // Сохраняем данные для верификации
      const saved = savePendingRegistration(phone, userData, verificationToken);
      
      console.log(`📋 Результат сохранения: ${saved ? 'УСПЕШНО' : 'ОШИБКА'}`);
      
      if (saved) {
        res.json({ 
          success: true, 
          message: "Данные сохранены, ожидается подтверждение телефона",
          verificationToken 
        });
      } else {
        res.status(500).json({ error: "Ошибка при сохранении данных верификации" });
      }
    } catch (error) {
      console.error("Ошибка при сохранении данных верификации:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // ПРИМЕЧАНИЕ: Проверка телефона перенесена в auth-sqlite.ts для единой логики

  // Telegram webhook endpoint
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const update = req.body;
      
      // Обрабатываем обновление от Telegram
      await handleTelegramUpdate(update);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Ошибка при обработке Telegram webhook:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Endpoint для подтверждения телефона через Telegram
  app.post("/api/telegram/verify-phone", async (req, res) => {
    try {
      const { phone, verificationToken } = req.body;
      
      console.log(`📋 Подтверждение телефона через Telegram: ${phone} с токеном: ${verificationToken}`);
      
      if (!phone || !verificationToken) {
        return res.status(400).json({ 
          error: "Отсутствуют обязательные поля: phone, verificationToken" 
        });
      }

      // Помечаем телефон как подтвержденный
      const verified = markPhoneAsVerified(phone, verificationToken);
      
      console.log(`📋 Результат подтверждения: ${verified ? 'УСПЕШНО' : 'ОШИБКА'}`);
      
      if (verified) {
        res.json({ 
          success: true, 
          message: "Телефон успешно подтвержден" 
        });
      } else {
        res.status(500).json({ error: "Ошибка при подтверждении телефона" });
      }
    } catch (error) {
      console.error("Ошибка при подтверждении телефона:", error);
      res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  // Проверка и завершение регистрации после подтверждения телефона
  app.post("/api/auth/check-phone-verification", async (req, res) => {
    try {
      const { phone, verificationToken } = req.body;
      
      console.log(`📋 Проверка верификации: ${phone} с токеном: ${verificationToken}`);
      
      if (!phone || !verificationToken) {
        return res.status(400).json({ 
          error: "Отсутствуют обязательные поля: phone, verificationToken" 
        });
      }

      // СНАЧАЛА проверяем, не создан ли уже пользователь (например, через Telegram бота)
      console.log(`🔍 DEBUG: Ищу пользователя с phone = "${phone}"`);
      
      const existingVerifiedUser = db.queryOne(
        "SELECT * FROM users WHERE phone = ? AND phone_verified = 1", 
        [phone]
      ) as UserRecord | null;

      console.log(`🔍 DEBUG: Результат поиска:`, existingVerifiedUser ? `найден ${existingVerifiedUser.email}` : 'не найден');

      if (existingVerifiedUser) {
        console.log(`✅ Пользователь уже создан и верифицирован: ${existingVerifiedUser.email}`);
        
        // Автоматически логиним
        const user = userRecordToSessionUser(existingVerifiedUser);
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('Ошибка автологина:', loginErr);
            return res.json({
              verified: true,
              message: "Телефон подтвержден, но требуется вход в систему",
              user
            });
          }
          
          console.log(`🎉 Автологин успешен: ${existingVerifiedUser.email}`);
          
          res.json({
            verified: true,
            message: "Добро пожаловать!",
            user,
            autoLogin: true
          });
        });
        return;
      }

      console.log(`⚠️ DEBUG: Пользователь с phone="${phone}" и phone_verified=1 не найден. Ищу в pending_registrations...`);

      // Если пользователь не найден, проверяем статус верификации в pending_registrations
      const isVerified = checkPhoneVerification(phone, verificationToken);
      
      if (isVerified) {
        // Телефон подтвержден - создаем пользователя!
        const userData = getPendingRegistrationData(phone, verificationToken);
        
        if (!userData) {
          return res.status(500).json({ 
            error: "Не удалось получить данные пользователя" 
          });
        }

        console.log(`👤 Создание пользователя: ${userData.email}`);

        // Проверяем, нет ли уже такого пользователя
        const existingUser = db.queryOne("SELECT * FROM users WHERE email = ?", [userData.email]) as UserRecord | null;
        if (existingUser) {
          console.log(`⚠️ Пользователь уже существует: ${userData.email}`);
          
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

        // 🚀 БЫСТРОЕ создание пользователя с оптимизированной сессией
        try {
          const user = await fastRegisterWithSession(req, {
            email: userData.email,
            password: userData.password,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: phone,
            address: userData.address
          });

          // Асинхронно удаляем из pending_registrations (не блокируем ответ)
          setImmediate(() => {
            removePendingRegistration(phone, verificationToken);
          });
            
          console.log(`🎉 Быстрая регистрация завершена: ${userData.email}`);
            
            res.json({
              verified: true,
              message: "Регистрация завершена успешно!",
              user,
              autoLogin: true
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

  // Create HTTP server
  const server = createServer(app);
  return server;
}

// Функция для генерации CSV для пользователей
function generateUsersCSV(users: Array<any>): string {
  const headers = [
    'ID',
    'Email',
    'Имя пользователя',
    'Полное имя',
    'Телефон',
    'Адрес',
    'Роль',
    'Баланс',
    'Дата регистрации'
  ];

  const rows = users.map(user => {
    const fullName = user.full_name || '';

    return [
      user.id,
      user.email,
      user.username || '',
      escapeCSVField(fullName),
      escapeCSVField(user.phone || ''),
      escapeCSVField(user.address || ''),
      user.is_admin ? 'Администратор' : 'Пользователь',
      `${user.balance || '0'} ₽`,
      new Date(user.created_at).toLocaleDateString('ru-RU')
    ];
  });

  return [headers, ...rows]
    .map(row => row.map(field => escapeCSVField(field.toString())).join(';'))
    .join('\n');
}

// Функция для генерации CSV для статистики
function generateStatisticsCSV(users: Array<any>, products: Array<any>, orders: Array<any>): string {
  const headers = ['Метрика', 'Значение'];
  
  const totalAmount = orders.reduce((sum, order) => {
    const amount = parseFloat(order.total_amount || '0');
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const rows = [
    ['Всего пользователей', users.length.toString()],
    ['Всего товаров', products.length.toString()],
    ['Всего заказов', orders.length.toString()],
    ['Активные заказы', orders.filter(o => o.order_status !== 'cancelled').length.toString()],
    ['Отмененные заказы', orders.filter(o => o.order_status === 'cancelled').length.toString()],
    ['Общая сумма заказов', `${totalAmount.toLocaleString('ru-RU')} ₽`]
  ];

  return [headers, ...rows]
    .map(row => row.map(field => escapeCSVField(field.toString())).join(';'))
    .join('\n');
}

// Функция для форматирования данных товара для клиента
function formatProductForClient(product: any) {
  if (!product) return null;
  
  // Преобразуем строку JSON в массив для images и labels
  let images = [];
  if (product.images) {
    try {
      images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
    } catch (e) {
      console.error("Ошибка при парсинге JSON images:", e);
    }
  }
  
  let labels = [];
  if (product.labels) {
    try {
      labels = typeof product.labels === 'string' ? JSON.parse(product.labels) : product.labels;
    } catch (e) {
      console.error("Ошибка при парсинге JSON labels:", e);
    }
  }
  
  // Формируем объект товара с правильными именами полей
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    originalPrice: product.original_price,
    images: images,
    quantity: product.quantity,
    category: product.category,
    isAvailable: Boolean(product.is_available),
    isPreorder: Boolean(product.is_preorder),
    isRare: Boolean(product.is_rare),
    isEasyToCare: Boolean(product.is_easy_to_care),
    labels: labels,
    deliveryCost: product.delivery_cost,
    plantSize: product.plant_size || 'medium',
    lightLevel: product.light_level || 'moderate',
    humidityLevel: product.humidity_level || 'medium',
    plantType: product.plant_type || 'decorative',
    origin: product.origin || 'tropical',
    isPetSafe: Boolean(product.is_pet_safe),
    isAirPurifying: Boolean(product.is_air_purifying),
    isFlowering: Boolean(product.is_flowering),
    // Флажки для товаров
    isHotDeal: Boolean(product.is_hot_deal),
    isBestseller: Boolean(product.is_bestseller),
    isNewArrival: Boolean(product.is_new_arrival),
    isLimitedEdition: Boolean(product.is_limited_edition),
    isDiscounted: Boolean(product.is_discounted),
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

// Функция для генерации CSV для товаров
function generateProductsCSV(products: Array<any>): string {
  const headers = [
    "ID", "Название", "Описание", "Цена", "Исходная цена", 
    "Количество", "Категория", "Доступен", "Предзаказ", 
    "Редкий", "Простой уход", "Дата создания"
  ];

  let csvContent = headers.join(';') + '\n';
  
  products.forEach(product => {
    const row = [
      product.id,
      escapeCSVField(product.name || ''),
      escapeCSVField(product.description || ''),
      product.price ? product.price.toString().replace('.', ',') : '0',
      product.original_price ? product.original_price.toString().replace('.', ',') : '',
      product.quantity || '0',
      escapeCSVField(product.category || ''),
      product.is_available ? "Да" : "Нет",
      product.is_preorder ? "Да" : "Нет",
      product.is_rare ? "Да" : "Нет",
      product.is_easy_to_care ? "Да" : "Нет",
      new Date(product.created_at).toLocaleDateString('ru-RU')
    ];
    
    csvContent += row.join(';') + '\n';
  });
  
  return csvContent;
}

// Функция для генерации CSV для заказов
function generateOrdersCSV(orders: Array<any>): string {
  const headers = [
    'ID',
    'Клиент',
    'Телефон',
    'Адрес',
    'Сумма',
    'Доставка',
    'Способ оплаты',
    'Статус оплаты',
    'Статус заказа',
    'Дата создания'
  ];

  const paymentMethodMap: Record<string, string> = {
    'ozonpay': 'Онлайн оплата',
    'directTransfer': 'Прямой перевод',
    'balance': 'Баланс'
  };

  const paymentStatusMap: Record<string, string> = {
    'pending': 'Ожидает оплаты',
    'completed': 'Оплачен',
    'failed': 'Ошибка оплаты'
  };

  const orderStatusMap: Record<string, string> = {
    'pending': 'В ожидании',
    'processing': 'В обработке',
    'shipped': 'Отправлен',
    'completed': 'Завершен',
    'cancelled': 'Отменен'
  };

  const rows = orders.map(order => [
    order.id,
    escapeCSVField(order.full_name || ''),
    escapeCSVField(order.phone || ''),
    escapeCSVField(order.address || ''),
    `${parseFloat(order.total_amount || '0').toLocaleString('ru-RU')} ₽`,
    order.delivery_type === 'cdek' ? 'СДЭК' : order.delivery_type === 'pickup' ? 'Самовывоз' : 'Почта России',
    paymentMethodMap[order.payment_method] || order.payment_method,
    paymentStatusMap[order.payment_status] || order.payment_status,
    orderStatusMap[order.order_status] || order.order_status,
    new Date(order.created_at).toLocaleDateString('ru-RU')
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => escapeCSVField(field.toString())).join(';'))
    .join('\n');
}