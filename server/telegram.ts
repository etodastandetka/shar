import { db } from './db-sqlite';

interface TelegramSettings {
  bot_token: string;
  chat_id: string;
  enable_notifications: boolean;
}

interface OrderData {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  totalAmount: number;
  paymentMethod: string;
  deliveryAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
}

export class TelegramService {
  private static instance: TelegramService;
  
  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }
  
  private async getSettings(): Promise<TelegramSettings | null> {
    try {
      const settings = db.queryOne("SELECT * FROM telegram_settings LIMIT 1") as TelegramSettings | null;
      return settings;
    } catch (error) {
      console.error("Error fetching telegram settings:", error);
      return null;
    }
  }
  
  private async sendMessage(botToken: string, chatId: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Telegram API error:", error);
        return false;
      }
      
      console.log("Telegram message sent successfully");
      return true;
    } catch (error) {
      console.error("Error sending telegram message:", error);
      return false;
    }
  }
  
  public async sendOrderNotification(orderData: OrderData): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      
      if (!settings || !settings.enable_notifications || !settings.bot_token || !settings.chat_id) {
        console.log("Telegram notifications disabled or not configured");
        return false;
      }
      
      const message = this.formatOrderMessage(orderData);
      return await this.sendMessage(settings.bot_token, settings.chat_id, message);
    } catch (error) {
      console.error("Error sending order notification:", error);
      return false;
    }
  }
  
  public async sendPaymentNotification(orderData: OrderData, paymentStatus: string): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      
      if (!settings || !settings.enable_notifications || !settings.bot_token || !settings.chat_id) {
        console.log("Telegram notifications disabled or not configured");
        return false;
      }
      
      const message = this.formatPaymentMessage(orderData, paymentStatus);
      return await this.sendMessage(settings.bot_token, settings.chat_id, message);
    } catch (error) {
      console.error("Error sending payment notification:", error);
      return false;
    }
  }

  public async sendPaymentProofNotification(orderData: OrderData): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      
      if (!settings || !settings.enable_notifications || !settings.bot_token || !settings.chat_id) {
        console.log("Telegram notifications disabled or not configured");
        return false;
      }
      
      const message = `📄 *Загружен чек для подтверждения!*\n\n` +
        `🛒 *Заказ:* #${orderData.id}\n` +
        `👤 *Клиент:* ${orderData.userName}\n` +
        `📧 *Email:* ${orderData.userEmail}\n` +
        `📱 *Телефон:* ${orderData.userPhone}\n` +
        `💰 *Сумма:* ${orderData.totalAmount}₽\n\n` +
        `⚠️ *Требуется проверка чека на сайте!*\n` +
        `👉 Перейдите в админ-панель для подтверждения платежа.`;
      
      return await this.sendMessage(settings.bot_token, settings.chat_id, message);
    } catch (error) {
      console.error("Error sending payment proof notification:", error);
      return false;
    }
  }
  
  public async testConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
    try {
      const testMessage = "🤖 <b>Тестовое сообщение от Jungle Plants</b>\n\nСвязь с Telegram-ботом установлена успешно!";
      
      const success = await this.sendMessage(botToken, chatId, testMessage);
      
      if (success) {
        return { success: true, message: "Тестовое сообщение отправлено успешно!" };
      } else {
        return { success: false, message: "Ошибка отправки тестового сообщения" };
      }
    } catch (error) {
      console.error("Error testing telegram connection:", error);
      return { success: false, message: `Ошибка тестирования: ${error.message}` };
    }
  }
  
  private formatOrderMessage(orderData: OrderData): string {
    const itemsList = orderData.items.map(item => 
      `• ${item.name} x${item.quantity} - ${item.price * item.quantity}₽`
    ).join('\n');
    
    const paymentMethodText = this.getPaymentMethodText(orderData.paymentMethod);
    
    return `🛒 <b>НОВЫЙ ЗАКАЗ #${orderData.id}</b>

👤 <b>Клиент:</b>
${orderData.userName}
📧 ${orderData.userEmail}
📱 ${orderData.userPhone}

📦 <b>Товары:</b>
${itemsList}

💰 <b>Сумма:</b> ${orderData.totalAmount}₽
💳 <b>Способ оплаты:</b> ${paymentMethodText}

🚚 <b>Адрес доставки:</b>
${orderData.deliveryAddress}

📅 <b>Дата заказа:</b> ${new Date(orderData.createdAt).toLocaleString('ru-RU')}`;
  }
  
  private formatPaymentMessage(orderData: OrderData, paymentStatus: string): string {
    const statusEmoji = paymentStatus === 'paid' ? '✅' : '❌';
    const statusText = paymentStatus === 'paid' ? 'ОПЛАЧЕН' : 'НЕ ОПЛАЧЕН';
    
    return `${statusEmoji} <b>СТАТУС ОПЛАТЫ ИЗМЕНЕН</b>

🛒 <b>Заказ #${orderData.id}</b>
👤 <b>Клиент:</b> ${orderData.userName}
💰 <b>Сумма:</b> ${orderData.totalAmount}₽
📊 <b>Статус:</b> ${statusText}

📅 <b>Время:</b> ${new Date().toLocaleString('ru-RU')}`;
  }
  
  private getPaymentMethodText(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'ozonpay':
        return 'Ozon Pay';
      case 'balance':
        return 'Баланс аккаунта';
      case 'bank_transfer':
        return 'Банковский перевод';
      default:
        return paymentMethod;
    }
  }
}

// Экспортируем singleton instance
export const telegramService = TelegramService.getInstance(); 