export interface VerificationData {
  code: string;
  userId: number;
  expires: number;
}

export interface UserData {
  id: number;
  phone: string;
  phone_verified: boolean;
  phone_verification_code: string;
}

export interface BotContext {
  userId: number;
  chatId: number;
  startCode?: string;
} 