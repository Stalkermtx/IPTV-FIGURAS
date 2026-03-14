import CryptoJS from 'crypto-js';

// A hardcoded secret key for client-side encryption.
// In a real-world scenario, this should be handled more securely,
// but since we are running entirely client-side, this provides
// obfuscation and basic encryption against casual inspection.
const SECRET_KEY = 'conextv-evolution-secret-key-2026';

export const encryptData = (data: string): string => {
  if (!data) return '';
  try {
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
};

export const decryptData = (encryptedData: string): string => {
  if (!encryptedData) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};
