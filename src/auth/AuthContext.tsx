import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from '../models/User';
import * as db from '../services/database';
import * as cryptoService from './cryptoService';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  hasUsers: boolean;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  checkHasUsers: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SECURE_STORE_KEY = 'current_user_id';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState(false);

  /**
   * Verifica si existen usuarios en la BD
   */
  const checkHasUsers = async () => {
    try {
      const exists = await db.hasAnyUser();
      setHasUsers(exists);
      return exists;
    } catch (error) {
      console.error('Error al verificar usuarios:', error);
      setHasUsers(false);
      return false;
    }
  };

  /**
   * Restaura la sesión del usuario desde SecureStore
   */
  const bootstrap = async () => {
    try {
      setIsLoading(true);

      // Verificar si hay usuarios
      await checkHasUsers();

      // Intentar restaurar sesión
      const storedUserId = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      
      if (storedUserId) {
        const userId = parseInt(storedUserId, 10);
        const user = await db.getUserById(userId);
        
        if (user && user.is_active) {
          // Omitir campos sensibles
          const { pin_salt, pin_hash, ...safeUser } = user;
          setCurrentUser(safeUser as User);
        } else {
          // Usuario no encontrado o inactivo, limpiar sesión
          await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
        }
      }
    } catch (error) {
      console.error('Error al restaurar sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  /**
   * Inicia sesión con username y PIN
   */
  const login = async (username: string, pin: string) => {
    try {
      const user = await db.getUserByUsername(username);

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!user.is_active) {
        throw new Error('Usuario inactivo');
      }

      // Verificar PIN
      const isValidPin = await cryptoService.verifyPin(
        pin,
        user.pin_salt!,
        user.pin_hash!
      );

      if (!isValidPin) {
        throw new Error('PIN incorrecto');
      }

      // Guardar sesión
      await SecureStore.setItemAsync(SECURE_STORE_KEY, user.id!.toString());

      // Omitir campos sensibles
      const { pin_salt, pin_hash, ...safeUser } = user;
      setCurrentUser(safeUser as User);
      setHasUsers(true);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    }
  };

  /**
   * Cierra la sesión del usuario
   */
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    isLoading,
    hasUsers,
    login,
    logout,
    checkHasUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook para usar el contexto de autenticación
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

