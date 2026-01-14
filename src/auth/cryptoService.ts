import * as Crypto from 'expo-crypto';

/**
 * Genera un salt aleatorio para el hash del PIN
 */
export const generateSalt = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Genera un hash del PIN usando un salt
 */
export const hashPin = async (pin: string, salt: string): Promise<string> => {
  const combined = salt + pin;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
  return hash;
};

/**
 * Verifica si un PIN coincide con el hash almacenado
 */
export const verifyPin = async (
  pin: string,
  salt: string,
  storedHash: string
): Promise<boolean> => {
  const calculatedHash = await hashPin(pin, salt);
  return calculatedHash === storedHash;
};

