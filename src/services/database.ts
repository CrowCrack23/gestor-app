import * as SQLite from 'expo-sqlite';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { SaleItem } from '../models/SaleItem';

let db: SQLite.SQLiteDatabase;

/**
 * Inicializa la base de datos y crea las tablas si no existen
 */
export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('app_gestor.db');

    console.log('Base de datos abierta correctamente');

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

    console.log('Tablas creadas correctamente');
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
    const sale = await db.getFirstAsync<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
    
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
        'INSERT INTO sales (total, date) VALUES (?, ?)',
        [sale.total, sale.date]
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
 * Obtiene el total de ventas de hoy
 */
export const getTodaySalesTotal = async (): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.getFirstAsync<{ total: number }>(
      'SELECT SUM(total) as total FROM sales WHERE date LIKE ?',
      [`${today}%`]
    );
    
    return result?.total || 0;
  } catch (error) {
    console.error('Error al obtener total de ventas:', error);
    throw error;
  }
};

