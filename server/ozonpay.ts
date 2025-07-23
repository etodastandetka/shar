import crypto from 'crypto';

export interface OzonPayConfig {
  accessKey: string;
  secretKey: string;
  notificationSecretKey: string;
  apiUrl: string;
  successUrl: string;
  failUrl: string;
  webhookUrl: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResponse {
  orderId: string;
  paymentUrl: string;
  status: string;
}

export interface OrderItem {
  extId: string;
  name: string;
  price: {
    currencyCode: string;
    value: number;
  };
  quantity: number;
  type: string;
  unitType: string;
  vat: string;
  needMark: boolean;
}

export class OzonPayAPI {
  private config: OzonPayConfig;

  constructor(config: OzonPayConfig) {
    this.config = config;
  }

  /**
   * Создание подписи для запроса createOrder согласно документации
   * accessKey + expiresAt + extId + fiscalizationType + paymentAlgorithm + amount.currencyCode + amount.value + secretKey
   */
  private createOrderSignature(
    accessKey: string,
    expiresAt: string,
    extId: string,
    fiscalizationType: string,
    paymentAlgorithm: string,
    currencyCode: string,
    value: number,
    secretKey: string
  ): string {
    const signatureString = accessKey + expiresAt + extId + fiscalizationType + paymentAlgorithm + currencyCode + value + secretKey;
    console.log('Signature string:', signatureString);
    const signature = crypto.createHash('sha256').update(signatureString, 'utf-8').digest('hex');
    console.log('Generated signature:', signature);
    return signature;
  }

  /**
   * Создание подписи для запроса getOrderDetails/getOrderStatus
   * accessKey + orderId + secretKey
   */
  private createDetailsSignature(accessKey: string, orderId: string, secretKey: string): string {
    const signatureString = accessKey + orderId + secretKey;
    return crypto.createHash('sha256').update(signatureString, 'utf-8').digest('hex');
  }

  /**
   * Проверка подписи webhook согласно документации
   * SHA256(accessKey|orderID|transactionID|extOrderID|amount|currencyCode|notificationSecretKey)
   */
  verifyWebhookSignature(webhookData: any): boolean {
    const { orderID, transactionID, extOrderID, amount, currencyCode, requestSign } = webhookData;
    
    const signatureString = `${this.config.accessKey}|${orderID}|${transactionID}|${extOrderID}|${amount}|${currencyCode}|${this.config.notificationSecretKey}`;
    const calculatedSignature = crypto.createHash('sha256').update(signatureString, 'utf-8').digest('hex');
    
    return calculatedSignature === requestSign;
  }

  /**
   * Создание платежа в Ozon Pay согласно документации
   */
  async createPayment(paymentData: PaymentRequest, items: OrderItem[]): Promise<PaymentResponse> {
    try {
      // Проверяем доступность API
      console.log('🔄 Проверка доступности Ozon Pay API...');
      
      const currencyCode = "643"; // RUB
      const amountValue = Math.round(paymentData.amount); // Сумма в копейках для OZON Pay
      const extId = `FRESH_ORDER_${Date.now()}_${paymentData.orderId}`; // Уникальный orderId чтобы избежать конфликтов с каталогом
      const fiscalizationType = "FISCAL_TYPE_SINGLE";
      const paymentAlgorithm = "PAY_ALGO_SMS";
      const expiresAt = ""; // Пустая строка согласно примеру в документации

      // Создаем подпись запроса
      const requestSign = this.createOrderSignature(
        this.config.accessKey,
        expiresAt,
        extId,
        fiscalizationType,
        paymentAlgorithm,
        currencyCode,
        amountValue,
        this.config.secretKey
      );

      const requestData = {
        accessKey: this.config.accessKey,
        amount: {
          currencyCode: currencyCode,
          value: amountValue
        },
        enableFiscalization: true,
        extId: extId,
        fiscalizationType: fiscalizationType,
        paymentAlgorithm: paymentAlgorithm,
        successUrl: this.config.successUrl,
        failUrl: this.config.failUrl,
        notificationUrl: this.config.webhookUrl,
        requestSign: requestSign,
        items: items
      };

      console.log('Ozon Pay createOrder request:', JSON.stringify(requestData, null, 2));
      console.log('Ozon Pay API URL:', `${this.config.apiUrl}/createOrder`);

      const response = await fetch(`${this.config.apiUrl}/createOrder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      console.log('Ozon Pay createOrder response status:', response.status);
      console.log('Ozon Pay createOrder response:', JSON.stringify(result, null, 2));

      // ⚠️ ДИАГНОСТИКА: Проверяем на подозрительные проблемы
      if (result.order && result.order.status === 'STATUS_PAID') {
        console.error('🚨 ВНИМАНИЕ: Заказ помечен как оплаченный сразу при создании!');
        console.error('Проверьте настройки Ozon Pay - возможно используется тестовый режим');
        console.error('Order ID:', result.order.id);
        console.error('Order Status:', result.order.status);
        console.error('Requested extId:', extId);
        console.error('Returned extId:', result.order.extId);
        
        // Добавляем детали для диагностики
        if (result.order.items) {
          console.error('Returned items details:', result.order.items.map((item: any) => ({
            extId: item.extId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })));
        }
      }
      
      if (result.order && result.order.items) {
        const requestedItems = items.length;
        const returnedItems = result.order.items.length;
        if (requestedItems !== returnedItems) {
          console.error(`🚨 НЕСООТВЕТСТВИЕ ТОВАРОВ: Отправлено ${requestedItems}, получено ${returnedItems}`);
          console.error('Отправленные товары:', items.map(i => `${i.name} (ID: ${i.extId}, Price: ${i.price.value})`));
          console.error('Полученные товары:', result.order.items.map((i: any) => `${i.name} (ID: ${i.extId}, Price: ${i.price})`));
          
          // Проверяем, есть ли товары с неожиданными именами
          const suspiciousItems = result.order.items.filter((returnedItem: any) => 
            !items.some(sentItem => sentItem.extId === returnedItem.extId)
          );
          
          if (suspiciousItems.length > 0) {
            console.error('🚨 ПОДОЗРИТЕЛЬНЫЕ ТОВАРЫ (не из нашего запроса):');
            suspiciousItems.forEach((item: any) => {
              console.error(`- ${item.name} (ID: ${item.extId}, Price: ${item.price})`);
            });
          }
        }
      }

      if (!response.ok) {
        // Если ошибка связана с API, выбрасываем специальную ошибку
        if (response.status === 404 || (result.message && result.message.includes('не найдено'))) {
          console.error('❌ Ozon Pay API недоступен или ключи устарели');
          throw new Error('OZON_PAY_API_UNAVAILABLE');
        }
        throw new Error(`Ozon Pay API Error: ${result.message || response.statusText}`);
      }

      if (!result.order) {
        throw new Error('Invalid response format from Ozon Pay API');
      }

      return {
        orderId: result.order.id,
        paymentUrl: result.order.payLink,
        status: result.order.status
      };
    } catch (error) {
      console.error('Ozon Pay API Error:', error);
      
      // Если это ошибка недоступности API, передаем её дальше для обработки
      if (error instanceof Error && error.message === 'OZON_PAY_API_UNAVAILABLE') {
        throw error;
      }
      
      throw new Error('Ошибка при создании платежа в Ozon Pay');
    }
  }

  /**
   * Получение информации о заказе
   */
  async getOrderDetails(orderId: string, extId?: string): Promise<any> {
    try {
      const requestSign = this.createDetailsSignature(this.config.accessKey, orderId, this.config.secretKey);

      const requestData = {
        id: orderId,
        extId: extId || "",
        accessKey: this.config.accessKey,
        requestSign: requestSign
      };

      console.log('Ozon Pay getOrderDetails request:', JSON.stringify(requestData, null, 2));

      const response = await fetch(`${this.config.apiUrl}/getOrderDetails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      console.log('Ozon Pay getOrderDetails response:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        throw new Error(`Ozon Pay API Error: ${result.message || response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error('Ozon Pay getOrderDetails Error:', error);
      throw new Error('Ошибка при получении информации о заказе');
    }
  }

  /**
   * Получение статуса заказа
   */
  async getOrderStatus(orderId: string, extId?: string): Promise<any> {
    try {
      const requestSign = this.createDetailsSignature(this.config.accessKey, orderId, this.config.secretKey);

      const requestData = {
        id: orderId,
        extId: extId || "",
        accessKey: this.config.accessKey,
        requestSign: requestSign
      };

      console.log('Ozon Pay getOrderStatus request:', JSON.stringify(requestData, null, 2));

      const response = await fetch(`${this.config.apiUrl}/getOrderStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      console.log('Ozon Pay getOrderStatus response:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        throw new Error(`Ozon Pay API Error: ${result.message || response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error('Ozon Pay getOrderStatus Error:', error);
      throw new Error('Ошибка при проверке статуса заказа');
    }
  }
}

// Создание экземпляра API
export const createOzonPayAPI = (): OzonPayAPI => {
  const config: OzonPayConfig = {
    accessKey: 'f3c0b7c9-9d17-4aa7-94b2-7106649534c3',
    secretKey: 'E6Wpm0o73sr67ZK7z6qvULn77BqG0lvR',
    notificationSecretKey: '3UrW32FscjhqAmeJhuq14eZ8hPamZlz8',
    apiUrl: 'https://payapi.ozon.ru/v1',
    successUrl: 'https://helens-jungle.ru/payment/success',
    failUrl: 'https://helens-jungle.ru/payment/fail',
    webhookUrl: 'https://helens-jungle.ru/api/ozonpay/webhook'
  };

  return new OzonPayAPI(config);
}; 