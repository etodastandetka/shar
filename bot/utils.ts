import { VerificationData } from './types';

// Генерация кода подтверждения
export function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Проверка формата номера телефона
export function isValidPhoneNumber(phone: string): boolean {
  return /^\+7\d{10}$/.test(phone);
}

// Форматирование номера телефона
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
  }
  return phone;
}

// Проверка срока действия кода подтверждения
export function isVerificationCodeExpired(data: VerificationData): boolean {
  return Date.now() > data.expires;
}

// Генерация ссылки для бота
export function generateBotLink(botUsername: string, code: string): string {
  return `https://t.me/${botUsername}?start=${code}`;
}

// Очистка устаревших кодов подтверждения
export function cleanupExpiredCodes(codes: Map<string, VerificationData>): void {
  for (const [key, data] of codes.entries()) {
    if (isVerificationCodeExpired(data)) {
      codes.delete(key);
    }
  }
} 