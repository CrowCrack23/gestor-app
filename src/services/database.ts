import * as SQLite from 'expo-sqlite';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { SaleItem } from '../models/SaleItem';
import { User } from '../models/User';
import { CashSession } from '../models/CashSession';
import { TableOrder } from '../models/TableOrder';
import { TableOrderItem } from '../models/TableOrderItem';

let db: SQLite.SQLiteDatabase;

const CURRENT_DB_VERSION = 8;

/**
 * Inicializa la base de datos y crea las tablas si no existen
 */
export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('app_gestor.db');

    console.log('Base de datos abierta correctamente');

    // Obtener versión actual de la BD
    const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = versionResult?.user_version || 0;

    console.log(`Versión de BD actual: ${currentVersion}`);

    // Crear tablas base (versión 0 -> 1)
    if (currentVersion < 1) {
      console.log('Creando tablas base...');
      
      // Crear tabla de productos
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Crear tabla de ventas
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total REAL NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Crear tabla de items de venta
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES sales(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        );
      `);

      console.log('Tablas base creadas');
    }

    // Migración versión 1 -> 2: Agregar sistema de usuarios
    if (currentVersion < 2) {
      console.log('Aplicando migración v2: Sistema de usuarios...');

      // Crear tabla de usuarios
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL,
          pin_salt TEXT NOT NULL,
          pin_hash TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Agregar columna user_id a sales (si no existe)
      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN user_id INTEGER;`);
        console.log('Columna user_id agregada a sales');
      } catch (error: any) {
        // Si la columna ya existe, ignorar el error
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
        console.log('Columna user_id ya existe en sales');
      }

      console.log('Migración v2 completada');
    }

    // Migración versión 2 -> 3: Sistema de cierre de caja
    if (currentVersion < 3) {
      console.log('Aplicando migración v3: Sistema de cierre de caja...');

      // Crear tabla de sesiones de caja
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cash_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          opened_at TEXT NOT NULL,
          closed_at TEXT,
          opened_by_user_id INTEGER NOT NULL,
          closed_by_user_id INTEGER,
          opening_cash REAL NOT NULL DEFAULT 0,
          declared_cash REAL,
          declared_card REAL,
          declared_transfer REAL,
          sales_cash_total REAL NOT NULL DEFAULT 0,
          sales_card_total REAL NOT NULL DEFAULT 0,
          sales_transfer_total REAL NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (opened_by_user_id) REFERENCES users(id),
          FOREIGN KEY (closed_by_user_id) REFERENCES users(id)
        );
      `);

      // Agregar columnas a sales
      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN cash_session_id INTEGER;`);
        console.log('Columna cash_session_id agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
      }

      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';`);
        console.log('Columna payment_method agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
      }

      console.log('Migración v3 completada');
    }

    // Migración versión 3 -> 4: Anulaciones
    if (currentVersion < 4) {
      console.log('Aplicando migración v4: Anulaciones...');

      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN voided_at TEXT;`);
        console.log('Columna voided_at agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
      }

      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN voided_by_user_id INTEGER;`);
        console.log('Columna voided_by_user_id agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
      }

      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN void_reason TEXT;`);
        console.log('Columna void_reason agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
      }

      console.log('Migración v4 completada');
    }

    // Migración versión 4 -> 5: Sistema de mesas
    if (currentVersion < 5) {
      console.log('Aplicando migración v5: Sistema de mesas...');

      // Crear tabla de pedidos de mesa
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS table_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_number INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          subtotal REAL NOT NULL DEFAULT 0,
          opened_at TEXT NOT NULL,
          opened_by_user_id INTEGER,
          cash_session_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (opened_by_user_id) REFERENCES users(id),
          FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id)
        );
      `);

      // Crear tabla de items de pedidos de mesa
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS table_order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (table_order_id) REFERENCES table_orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id)
        );
      `);

      // Agregar columna table_order_id a sales
      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN table_order_id INTEGER;`);
        console.log('Columna table_order_id agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
      }

      console.log('Migración v5 completada');
    }

    // Migración v6: Soporte para salidas de cuenta casa
    if (currentVersion < 6) {
      console.log('Aplicando migración v6: Cuenta casa...');

      // Agregar columnas a sales (si no existen)
      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN sale_type TEXT DEFAULT 'normal';`);
        console.log('Columna sale_type agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
        console.log('Columna sale_type ya existe en sales');
      }

      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN notes TEXT;`);
        console.log('Columna notes agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
        console.log('Columna notes ya existe en sales');
      }

      console.log('Migración v6 completada');
    }

    // Migración v7: Soporte para pagos mixtos
    if (currentVersion < 7) {
      console.log('Aplicando migración v7: Pagos mixtos...');
      
      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN cash_amount REAL;`);
        console.log('Columna cash_amount agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
        console.log('Columna cash_amount ya existe en sales');
      }

      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN transfer_amount REAL;`);
        console.log('Columna transfer_amount agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
        console.log('Columna transfer_amount ya existe en sales');
      }
      
      console.log('Migración v7 completada');
    }

    // Migración v8: Soporte para vuelto en pagos
    if (currentVersion < 8) {
      console.log('Aplicando migración v8: Funcionalidad de vuelto...');
      
      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN received_amount REAL;`);
        console.log('Columna received_amount agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
        console.log('Columna received_amount ya existe en sales');
      }

      try {
        await db.execAsync(`ALTER TABLE sales ADD COLUMN change_amount REAL;`);
        console.log('Columna change_amount agregada a sales');
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          throw error;
        }
        console.log('Columna change_amount ya existe en sales');
      }
      
      console.log('Migración v8 completada');
    }

    // Actualizar versión de la BD
    if (currentVersion < CURRENT_DB_VERSION) {
      await db.execAsync(`PRAGMA user_version = ${CURRENT_DB_VERSION}`);
      console.log(`BD actualizada a versión ${CURRENT_DB_VERSION}`);
    }

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

// ==================== PRODUCTOS ====================

/**
 * Obtiene todos los productos
 */
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const result = await db.getAllAsync<Product>('SELECT * FROM products ORDER BY name ASC');
    return result;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    throw error;
  }
};

/**
 * Obtiene un producto por ID
 */
export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    const result = await db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', [id]);
    return result || null;
  } catch (error) {
    console.error('Error al obtener producto:', error);
    throw error;
  }
};

/**
 * Crea un nuevo producto
 */
export const createProduct = async (product: Product): Promise<number> => {
  try {
    const result = await db.runAsync(
      'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
      [product.name, product.price, product.stock]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error al crear producto:', error);
    throw error;
  }
};

/**
 * Actualiza un producto existente
 */
export const updateProduct = async (product: Product): Promise<void> => {
  try {
    await db.runAsync(
      'UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?',
      [product.name, product.price, product.stock, product.id]
    );
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    throw error;
  }
};

/**
 * Elimina un producto
 */
export const deleteProduct = async (id: number): Promise<void> => {
  try {
    await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    throw error;
  }
};

// ==================== VENTAS ====================

/**
 * Obtiene todas las ventas
 */
export const getAllSales = async (): Promise<Sale[]> => {
  try {
    const result = await db.getAllAsync<Sale>('SELECT * FROM sales ORDER BY date DESC');
    return result;
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    throw error;
  }
};

/**
 * Obtiene una venta por ID con sus items
 */
export const getSaleById = async (id: number): Promise<Sale | null> => {
  try {
    const sale = await db.getFirstAsync<Sale>(
      `SELECT s.*, u.username 
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`,
      [id]
    );
    
    if (!sale) {
      return null;
    }
    
    // Obtener items de la venta con información del producto
    const items = await db.getAllAsync<SaleItem>(
      `SELECT si.*, p.name as product_name 
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       WHERE si.sale_id = ?`,
      [id]
    );
    
    sale.items = items;
    
    return sale;
  } catch (error) {
    console.error('Error al obtener venta:', error);
    throw error;
  }
};

/**
 * Crea una nueva venta con sus items
 */
export const createSale = async (sale: Sale, items: SaleItem[]): Promise<number> => {
  try {
    let saleId: number = 0;

    await db.withTransactionAsync(async () => {
      // Insertar venta
      const saleResult = await db.runAsync(
        'INSERT INTO sales (total, date, user_id, cash_session_id, payment_method, sale_type, notes, table_order_id, cash_amount, transfer_amount, received_amount, change_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          sale.total, 
          sale.date, 
          sale.user_id || null, 
          sale.cash_session_id || null, 
          sale.payment_method || 'cash',
          sale.sale_type || 'normal',
          sale.notes || null,
          sale.table_order_id || null,
          sale.cash_amount || null,
          sale.transfer_amount || null,
          sale.received_amount || null,
          sale.change_amount || null
        ]
      );
      
      saleId = saleResult.lastInsertRowId;
      
      // Insertar items de venta
      for (const item of items) {
        await db.runAsync(
          'INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
          [saleId, item.product_id, item.quantity, item.price, item.subtotal]
        );
        
        // Actualizar stock del producto
        await db.runAsync(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    });
    
    return saleId;
  } catch (error) {
    console.error('Error al crear venta:', error);
    throw error;
  }
};

/**
 * Obtiene ventas por rango de fechas
 */
export const getSalesByDateRange = async (startDate: string, endDate: string): Promise<Sale[]> => {
  try {
    const result = await db.getAllAsync<Sale>(
      'SELECT * FROM sales WHERE date BETWEEN ? AND ? ORDER BY date DESC',
      [startDate, endDate]
    );
    
    return result;
  } catch (error) {
    console.error('Error al obtener ventas por fecha:', error);
    throw error;
  }
};

/**
 * Obtiene todas las ventas de una sesión de caja específica
 */
export const getSalesByCashSession = async (sessionId: number): Promise<Sale[]> => {
  try {
    const result = await db.getAllAsync<Sale>(
      `SELECT s.*, u.username 
       FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       WHERE s.cash_session_id = ? AND s.voided_at IS NULL
       ORDER BY s.date DESC`,
      [sessionId]
    );
    
    return result;
  } catch (error) {
    console.error('Error al obtener ventas por sesión de caja:', error);
    throw error;
  }
};

/**
 * Obtiene los productos vendidos durante una sesión de caja específica
 */
export const getProductsSoldByCashSession = async (sessionId: number): Promise<any[]> => {
  try {
    const result = await db.getAllAsync(
      `SELECT 
        p.id as product_id,
        p.name as product_name,
        p.stock as current_stock,
        SUM(si.quantity) as quantity_sold,
        SUM(si.subtotal) as total_amount,
        AVG(si.price) as average_price
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN sales s ON si.sale_id = s.id
       WHERE s.cash_session_id = ? AND s.voided_at IS NULL
       GROUP BY si.product_id, p.name, p.stock
       ORDER BY quantity_sold DESC`,
      [sessionId]
    );
    
    return result;
  } catch (error) {
    console.error('Error al obtener productos vendidos por sesión de caja:', error);
    throw error;
  }
};

/**
 * Obtiene el total de ventas de hoy
 */
export const getTodaySalesTotal = async (): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.getFirstAsync<{ total: number }>(
      'SELECT SUM(total) as total FROM sales WHERE date LIKE ? AND voided_at IS NULL',
      [`${today}%`]
    );
    
    return result?.total || 0;
  } catch (error) {
    console.error('Error al obtener total de ventas:', error);
    throw error;
  }
};

/**
 * Anula una venta y revierte el stock
 */
export const voidSale = async (saleId: number, userId: number, reason: string): Promise<void> => {
  try {
    await db.withTransactionAsync(async () => {
      // Obtener items de la venta
      const items = await db.getAllAsync<SaleItem>(
        'SELECT * FROM sale_items WHERE sale_id = ?',
        [saleId]
      );

      // Reversar stock
      for (const item of items) {
        await db.runAsync(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Marcar venta como anulada
      await db.runAsync(
        'UPDATE sales SET voided_at = ?, voided_by_user_id = ?, void_reason = ? WHERE id = ?',
        [new Date().toISOString(), userId, reason, saleId]
      );
    });
  } catch (error) {
    console.error('Error al anular venta:', error);
    throw error;
  }
};

// ==================== REPORTES ====================

/**
 * Obtiene reporte de ventas por período
 */
export const getReportByPeriod = async (startDate: string, endDate: string): Promise<{
  totalSales: number;
  salesCount: number;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
}> => {
  try {
    const totalResult = await db.getFirstAsync<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
       FROM sales 
       WHERE date BETWEEN ? AND ? AND voided_at IS NULL AND (sale_type IS NULL OR sale_type = 'normal')`,
      [startDate, endDate]
    );

    const cashResult = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(
         SUM(CASE 
           WHEN payment_method = 'cash' THEN total 
           WHEN payment_method = 'mixed' THEN cash_amount 
           ELSE 0 
         END), 0) as total 
       FROM sales 
       WHERE date BETWEEN ? AND ? AND voided_at IS NULL AND (sale_type IS NULL OR sale_type = 'normal')`,
      [startDate, endDate]
    );

    const transferResult = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(
         SUM(CASE 
           WHEN payment_method = 'transfer' THEN total 
           WHEN payment_method = 'mixed' THEN transfer_amount 
           ELSE 0 
         END), 0) as total 
       FROM sales 
       WHERE date BETWEEN ? AND ? AND voided_at IS NULL AND (sale_type IS NULL OR sale_type = 'normal')`,
      [startDate, endDate]
    );

    return {
      totalSales: totalResult?.total || 0,
      salesCount: totalResult?.count || 0,
      cashTotal: cashResult?.total || 0,
      cardTotal: 0, // Ya no se usa tarjeta
      transferTotal: transferResult?.total || 0,
    };
  } catch (error) {
    console.error('Error al obtener reporte por período:', error);
    throw error;
  }
};

/**
 * Obtiene reporte por vendedor
 */
export const getReportByVendor = async (startDate: string, endDate: string): Promise<Array<{
  username: string;
  total: number;
  count: number;
}>> => {
  try {
    const result = await db.getAllAsync<{ username: string; total: number; count: number }>(
      `SELECT COALESCE(u.username, 'Sin asignar') as username, 
              COALESCE(SUM(s.total), 0) as total, 
              COUNT(s.id) as count
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.date BETWEEN ? AND ? AND s.voided_at IS NULL AND (s.sale_type IS NULL OR s.sale_type = 'normal')
       GROUP BY s.user_id
       ORDER BY total DESC`,
      [startDate, endDate]
    );
    return result;
  } catch (error) {
    console.error('Error al obtener reporte por vendedor:', error);
    throw error;
  }
};

/**
 * Obtiene top productos vendidos
 */
export const getTopProducts = async (startDate: string, endDate: string, limit: number = 10): Promise<Array<{
  name: string;
  quantity: number;
  total: number;
}>> => {
  try {
    const result = await db.getAllAsync<{ name: string; quantity: number; total: number }>(
      `SELECT p.name, 
              SUM(si.quantity) as quantity, 
              SUM(si.subtotal) as total
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN sales s ON si.sale_id = s.id
       WHERE s.date BETWEEN ? AND ? AND s.voided_at IS NULL AND (s.sale_type IS NULL OR s.sale_type = 'normal')
       GROUP BY si.product_id
       ORDER BY quantity DESC
       LIMIT ?`,
      [startDate, endDate, limit]
    );
    return result;
  } catch (error) {
    console.error('Error al obtener top productos:', error);
    throw error;
  }
};

/**
 * Obtiene ventas por hora del día
 */
export const getSalesByHour = async (startDate: string, endDate: string): Promise<Array<{
  hour: number;
  count: number;
  total: number;
}>> => {
  try {
    const result = await db.getAllAsync<{ hour: number; count: number; total: number }>(
      `SELECT CAST(strftime('%H', date) AS INTEGER) as hour,
              COUNT(*) as count,
              SUM(total) as total
       FROM sales
       WHERE date BETWEEN ? AND ? AND voided_at IS NULL AND (sale_type IS NULL OR sale_type = 'normal')
       GROUP BY hour
       ORDER BY count DESC`,
      [startDate, endDate]
    );
    return result;
  } catch (error) {
    console.error('Error al obtener ventas por hora:', error);
    throw error;
  }
};

// ==================== USUARIOS ====================

/**
 * Obtiene un usuario por username
 */
export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const result = await db.getFirstAsync<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return result || null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
};

/**
 * Obtiene un usuario por ID
 */
export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const result = await db.getFirstAsync<User>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return result || null;
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    throw error;
  }
};

/**
 * Crea un nuevo usuario
 */
export const createUser = async (user: User): Promise<number> => {
  try {
    const result = await db.runAsync(
      'INSERT INTO users (username, role, pin_salt, pin_hash, is_active) VALUES (?, ?, ?, ?, ?)',
      [user.username, user.role, user.pin_salt!, user.pin_hash!, user.is_active]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

/**
 * Obtiene todos los usuarios
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const result = await db.getAllAsync<User>(
      'SELECT id, username, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return result;
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
};

/**
 * Verifica si existe al menos un usuario en la BD
 */
export const hasAnyUser = async (): Promise<boolean> => {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM users'
    );
    return (result?.count || 0) > 0;
  } catch (error) {
    console.error('Error al verificar usuarios:', error);
    return false;
  }
};

/**
 * Activa o desactiva un usuario
 */
export const setUserActive = async (userId: number, isActive: boolean): Promise<void> => {
  try {
    await db.runAsync(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, userId]
    );
  } catch (error) {
    console.error('Error al actualizar estado del usuario:', error);
    throw error;
  }
};

/**
 * Actualiza el PIN de un usuario
 */
export const updateUserPin = async (userId: number, pinSalt: string, pinHash: string): Promise<void> => {
  try {
    await db.runAsync(
      'UPDATE users SET pin_salt = ?, pin_hash = ? WHERE id = ?',
      [pinSalt, pinHash, userId]
    );
  } catch (error) {
    console.error('Error al actualizar PIN:', error);
    throw error;
  }
};

// ==================== SESIONES DE CAJA ====================

/**
 * Obtiene la sesión de caja abierta actualmente
 */
export const getOpenCashSession = async (): Promise<CashSession | null> => {
  try {
    const result = await db.getFirstAsync<CashSession>(
      `SELECT cs.*, 
              u1.username as opened_by_username 
       FROM cash_sessions cs
       LEFT JOIN users u1 ON cs.opened_by_user_id = u1.id
       WHERE cs.closed_at IS NULL
       ORDER BY cs.opened_at DESC
       LIMIT 1`
    );
    return result || null;
  } catch (error) {
    console.error('Error al obtener sesión de caja abierta:', error);
    throw error;
  }
};

/**
 * Abre una nueva sesión de caja
 */
export const openCashSession = async (openingCash: number, openedByUserId: number): Promise<number> => {
  try {
    // Verificar que no haya una sesión abierta
    const openSession = await getOpenCashSession();
    if (openSession) {
      throw new Error('Ya existe una sesión de caja abierta');
    }

    const result = await db.runAsync(
      `INSERT INTO cash_sessions (opened_at, opened_by_user_id, opening_cash) 
       VALUES (?, ?, ?)`,
      [new Date().toISOString(), openedByUserId, openingCash]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error al abrir sesión de caja:', error);
    throw error;
  }
};

/**
 * Cierra una sesión de caja con los totales declarados
 */
export const closeCashSession = async (
  sessionId: number,
  declaredCash: number,
  declaredCard: number,
  declaredTransfer: number,
  closedByUserId: number,
  notes?: string
): Promise<void> => {
  try {
    await db.withTransactionAsync(async () => {
      // Calcular totales de ventas por método
      const cashTotal = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(
           SUM(CASE 
             WHEN payment_method = 'cash' THEN total 
             WHEN payment_method = 'mixed' THEN cash_amount 
             ELSE 0 
           END), 0) as total 
         FROM sales 
         WHERE cash_session_id = ?`,
        [sessionId]
      );

      const transferTotal = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(
           SUM(CASE 
             WHEN payment_method = 'transfer' THEN total 
             WHEN payment_method = 'mixed' THEN transfer_amount 
             ELSE 0 
           END), 0) as total 
         FROM sales 
         WHERE cash_session_id = ?`,
        [sessionId]
      );

      // Actualizar sesión con los totales
      await db.runAsync(
        `UPDATE cash_sessions 
         SET closed_at = ?,
             closed_by_user_id = ?,
             declared_cash = ?,
             declared_card = ?,
             declared_transfer = ?,
             sales_cash_total = ?,
             sales_card_total = ?,
             sales_transfer_total = ?,
             notes = ?
         WHERE id = ?`,
        [
          new Date().toISOString(),
          closedByUserId,
          declaredCash,
          0, // Ya no se usa tarjeta
          declaredTransfer,
          cashTotal?.total || 0,
          0, // Ya no se usa tarjeta
          transferTotal?.total || 0,
          notes || null,
          sessionId,
        ]
      );
    });
  } catch (error) {
    console.error('Error al cerrar sesión de caja:', error);
    throw error;
  }
};

/**
 * Obtiene una sesión de caja por ID
 */
export const getCashSessionById = async (id: number): Promise<CashSession | null> => {
  try {
    const result = await db.getFirstAsync<CashSession>(
      `SELECT cs.*, 
              u1.username as opened_by_username,
              u2.username as closed_by_username
       FROM cash_sessions cs
       LEFT JOIN users u1 ON cs.opened_by_user_id = u1.id
       LEFT JOIN users u2 ON cs.closed_by_user_id = u2.id
       WHERE cs.id = ?`,
      [id]
    );
    return result || null;
  } catch (error) {
    console.error('Error al obtener sesión de caja:', error);
    throw error;
  }
};

/**
 * Lista todas las sesiones de caja
 */
export const listCashSessions = async (limit: number = 50): Promise<CashSession[]> => {
  try {
    const result = await db.getAllAsync<CashSession>(
      `SELECT cs.*, 
              u1.username as opened_by_username,
              u2.username as closed_by_username
       FROM cash_sessions cs
       LEFT JOIN users u1 ON cs.opened_by_user_id = u1.id
       LEFT JOIN users u2 ON cs.closed_by_user_id = u2.id
       ORDER BY cs.opened_at DESC
       LIMIT ?`,
      [limit]
    );
    return result;
  } catch (error) {
    console.error('Error al listar sesiones de caja:', error);
    throw error;
  }
};

// ==================== PEDIDOS DE MESA ====================

/**
 * Obtiene todos los pedidos de mesa activos
 */
export const getAllTableOrders = async (): Promise<TableOrder[]> => {
  try {
    const result = await db.getAllAsync<TableOrder>(
      `SELECT tor.*, u.username as opened_by_username
       FROM table_orders tor
       LEFT JOIN users u ON tor.opened_by_user_id = u.id
       WHERE tor.status = 'open'
       ORDER BY tor.table_number ASC`
    );
    return result;
  } catch (error) {
    console.error('Error al obtener pedidos de mesa:', error);
    throw error;
  }
};

/**
 * Obtiene un pedido de mesa por ID con sus items
 */
export const getTableOrderById = async (id: number): Promise<TableOrder | null> => {
  try {
    const tableOrder = await db.getFirstAsync<TableOrder>(
      `SELECT tor.*, u.username as opened_by_username
       FROM table_orders tor
       LEFT JOIN users u ON tor.opened_by_user_id = u.id
       WHERE tor.id = ?`,
      [id]
    );
    
    if (!tableOrder) {
      return null;
    }
    
    // Obtener items del pedido con información del producto
    const items = await db.getAllAsync<TableOrderItem>(
      `SELECT toi.*, p.name as product_name 
       FROM table_order_items toi 
       JOIN products p ON toi.product_id = p.id 
       WHERE toi.table_order_id = ?`,
      [id]
    );
    
    tableOrder.items = items;
    
    return tableOrder;
  } catch (error) {
    console.error('Error al obtener pedido de mesa:', error);
    throw error;
  }
};

/**
 * Obtiene un pedido de mesa por número de mesa
 */
export const getTableOrderByTableNumber = async (tableNumber: number): Promise<TableOrder | null> => {
  try {
    const tableOrder = await db.getFirstAsync<TableOrder>(
      `SELECT tor.*, u.username as opened_by_username
       FROM table_orders tor
       LEFT JOIN users u ON tor.opened_by_user_id = u.id
       WHERE tor.table_number = ? AND tor.status = 'open'`,
      [tableNumber]
    );
    
    if (!tableOrder) {
      return null;
    }
    
    // Obtener items del pedido
    const items = await db.getAllAsync<TableOrderItem>(
      `SELECT toi.*, p.name as product_name 
       FROM table_order_items toi 
       JOIN products p ON toi.product_id = p.id 
       WHERE toi.table_order_id = ?`,
      [tableOrder.id]
    );
    
    tableOrder.items = items;
    
    return tableOrder;
  } catch (error) {
    console.error('Error al obtener pedido por número de mesa:', error);
    throw error;
  }
};

/**
 * Crea un nuevo pedido de mesa
 */
export const createTableOrder = async (tableOrder: TableOrder): Promise<number> => {
  try {
    // Verificar que la mesa no esté ocupada
    const existingOrder = await getTableOrderByTableNumber(tableOrder.table_number);
    if (existingOrder) {
      throw new Error('La mesa ya está ocupada');
    }

    const result = await db.runAsync(
      `INSERT INTO table_orders (table_number, status, subtotal, opened_at, opened_by_user_id, cash_session_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tableOrder.table_number,
        tableOrder.status || 'open',
        tableOrder.subtotal || 0,
        tableOrder.opened_at,
        tableOrder.opened_by_user_id || null,
        tableOrder.cash_session_id || null,
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error al crear pedido de mesa:', error);
    throw error;
  }
};

/**
 * Agrega un item a un pedido de mesa
 */
export const addTableOrderItem = async (tableOrderId: number, item: TableOrderItem): Promise<number> => {
  try {
    let itemId: number = 0;

    await db.withTransactionAsync(async () => {
      // Verificar si el producto ya existe en el pedido
      const existingItem = await db.getFirstAsync<TableOrderItem>(
        'SELECT * FROM table_order_items WHERE table_order_id = ? AND product_id = ?',
        [tableOrderId, item.product_id]
      );

      if (existingItem) {
        // Actualizar cantidad
        const newQuantity = existingItem.quantity + item.quantity;
        const newSubtotal = item.price * newQuantity;
        
        await db.runAsync(
          'UPDATE table_order_items SET quantity = ?, subtotal = ? WHERE id = ?',
          [newQuantity, newSubtotal, existingItem.id]
        );
        itemId = existingItem.id!;
      } else {
        // Insertar nuevo item
        const result = await db.runAsync(
          'INSERT INTO table_order_items (table_order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
          [tableOrderId, item.product_id, item.quantity, item.price, item.subtotal]
        );
        itemId = result.lastInsertRowId;
      }

      // Actualizar subtotal del pedido
      await updateTableOrderSubtotal(tableOrderId);
    });

    return itemId;
  } catch (error) {
    console.error('Error al agregar item al pedido:', error);
    throw error;
  }
};

/**
 * Actualiza la cantidad de un item del pedido
 */
export const updateTableOrderItem = async (itemId: number, quantity: number): Promise<void> => {
  try {
    await db.withTransactionAsync(async () => {
      // Obtener el item
      const item = await db.getFirstAsync<TableOrderItem>(
        'SELECT * FROM table_order_items WHERE id = ?',
        [itemId]
      );

      if (!item) {
        throw new Error('Item no encontrado');
      }

      const newSubtotal = item.price * quantity;

      await db.runAsync(
        'UPDATE table_order_items SET quantity = ?, subtotal = ? WHERE id = ?',
        [quantity, newSubtotal, itemId]
      );

      // Actualizar subtotal del pedido
      await updateTableOrderSubtotal(item.table_order_id!);
    });
  } catch (error) {
    console.error('Error al actualizar item:', error);
    throw error;
  }
};

/**
 * Elimina un item de un pedido de mesa
 */
export const deleteTableOrderItem = async (itemId: number): Promise<void> => {
  try {
    await db.withTransactionAsync(async () => {
      // Obtener el item para saber el table_order_id
      const item = await db.getFirstAsync<TableOrderItem>(
        'SELECT * FROM table_order_items WHERE id = ?',
        [itemId]
      );

      if (!item) {
        return;
      }

      await db.runAsync('DELETE FROM table_order_items WHERE id = ?', [itemId]);

      // Actualizar subtotal del pedido
      await updateTableOrderSubtotal(item.table_order_id!);
    });
  } catch (error) {
    console.error('Error al eliminar item:', error);
    throw error;
  }
};

/**
 * Actualiza el subtotal de un pedido de mesa
 */
const updateTableOrderSubtotal = async (tableOrderId: number): Promise<void> => {
  try {
    const result = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(subtotal), 0) as total FROM table_order_items WHERE table_order_id = ?',
      [tableOrderId]
    );

    await db.runAsync(
      'UPDATE table_orders SET subtotal = ? WHERE id = ?',
      [result?.total || 0, tableOrderId]
    );
  } catch (error) {
    console.error('Error al actualizar subtotal:', error);
    throw error;
  }
};

/**
 * Cierra un pedido de mesa (cambia status a closed)
 */
export const closeTableOrder = async (tableOrderId: number): Promise<void> => {
  try {
    await db.runAsync(
      'UPDATE table_orders SET status = ? WHERE id = ?',
      ['closed', tableOrderId]
    );
  } catch (error) {
    console.error('Error al cerrar pedido de mesa:', error);
    throw error;
  }
};

/**
 * Cancela un pedido de mesa y elimina sus items
 */
export const cancelTableOrder = async (tableOrderId: number): Promise<void> => {
  try {
    await db.withTransactionAsync(async () => {
      // Eliminar items
      await db.runAsync('DELETE FROM table_order_items WHERE table_order_id = ?', [tableOrderId]);
      
      // Cerrar el pedido
      await db.runAsync(
        'UPDATE table_orders SET status = ?, subtotal = 0 WHERE id = ?',
        ['closed', tableOrderId]
      );
    });
  } catch (error) {
    console.error('Error al cancelar pedido de mesa:', error);
    throw error;
  }
};
