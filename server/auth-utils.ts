// auth-utils.ts
import crypto from 'crypto';
import { IUser } from './types';

export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
};

export const comparePasswords = (stored: string, supplied: string): boolean => {
  if (!stored || !supplied) return false;
  
  try {
    // Проверяем новый формат (salt:iterations:keylen:digest:hash)
    const parts = stored.split(':');
    
    if (parts.length === 5) {
      // Новый формат: salt:iterations:keylen:digest:hash
      const [salt, iterations, keylen, digest, hash] = parts;
      const suppliedHash = crypto.pbkdf2Sync(
        supplied, 
        salt, 
        parseInt(iterations), 
        parseInt(keylen), 
        digest
      ).toString('hex');
      return hash === suppliedHash;
    } else if (parts.length === 2) {
      // Старый формат: salt:hash
      const [salt, hash] = parts;
      const suppliedHash = crypto.pbkdf2Sync(supplied, salt, 1000, 64, 'sha512').toString('hex');
      return hash === suppliedHash;
    } else {
      console.error('Неизвестный формат хеша пароля:', parts.length, 'частей');
      return false;
    }
  } catch (error) {
    console.error('Ошибка при проверке пароля:', error);
    return false;
  }
};

export const sanitizeUser = (user: IUser): Omit<IUser, 'password'> => {
  const { password, ...safeUser } = user;
  return safeUser;
};