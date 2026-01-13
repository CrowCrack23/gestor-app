import SQLite from 'react-native-sqlite-storage';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { SaleItem } from '../models/SaleItem';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DATABASE_NAME = 'app_gestor.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAY_NAME = 'App Gestor Database';
const DATABASE_SIZE = 200000;

let database: SQLite.SQLiteDatabase;

/**
 * Inicializa la base de datos y crea las tablas si no existen
 */
export const initDatabase = async (): Promise<void> => {
  try {
    database = await SQLite.openDatabase({
      name: DATABASE_NAME,
      location: 'default',
    });

    console.log('Base de datos abierta correctamente');

    // Crear tabla de productos
    await database.executeSql(
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`
    );

    // Crear tabla de ventas
    await database.executeSql(
      `CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total REAL NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`
    );

    // Crear tabla de items de venta
    await database.executeSql(
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );`
    );

    console.log('Tablas creadas correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

/**
 * Cierra la conexión con la base de datos
 */
export const closeDatabase = async (): Promise<void> => {
  if (database) {
    await database.close();
    console.log('Base de datos cerrada');
  }
};

// ==================== PRODUCTOS ====================

/**
 * Obtiene todos los productos
 */
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const [results] = await database.executeSql('SELECT * FROM products ORDER BY name ASC');
    const products: Product[] = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      products.push(results.rows.item(i));
    }
    
    return products;
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
    const [results] = await database.executeSql('SELECT * FROM products WHERE id = ?', [id]);
    
    if (results.rows.length > 0) {
      return results.rows.item(0);
    }
    
    return null;
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
    const [result] = await database.executeSql(
      'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
      [product.name, product.price, product.stock]
    );
    
    return result.insertId || 0;
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
    await database.executeSql(
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
    await database.executeSql('DELETE FROM products WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    throw error;
  }
};

/**
 * Actualiza el stock de un producto
 */
export const updateProductStock = async (productId: number, quantity: number): Promise<void> => {
  try {
    await database.executeSql(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [quantity, productId]
    );
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    throw error;
  }
};

// ==================== VENTAS ====================

/**
 * Obtiene todas las ventas
 */
export const getAllSales = async (): Promise<Sale[]> => {
  try {
    const [results] = await database.executeSql('SELECT * FROM sales ORDER BY date DESC');
    const sales: Sale[] = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      sales.push(results.rows.item(i));
    }
    
    return sales;
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
    const [saleResults] = await database.executeSql('SELECT * FROM sales WHERE id = ?', [id]);
    
    if (saleResults.rows.length === 0) {
      return null;
    }
    
    const sale: Sale = saleResults.rows.item(0);
    
    // Obtener items de la venta con información del producto
    const [itemsResults] = await database.executeSql(
      `SELECT si.*, p.name as product_name 
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       WHERE si.sale_id = ?`,
      [id]
    );
    
    const items: SaleItem[] = [];
    for (let i = 0; i < itemsResults.rows.length; i++) {
      items.push(itemsResults.rows.item(i));
    }
    
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
    // Iniciar transacción
    await database.transaction(async (tx) => {
      // Insertar venta
      const [saleResult] = await tx.executeSql(
        'INSERT INTO sales (total, date) VALUES (?, ?)',
        [sale.total, sale.date]
      );
      
      const saleId = saleResult.insertId || 0;
      
      // Insertar items de venta
      for (const item of items) {
        await tx.executeSql(
          'INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
          [saleId, item.product_id, item.quantity, item.price, item.subtotal]
        );
        
        // Actualizar stock del producto
        await tx.executeSql(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      
      sale.id = saleId;
    });
    
    return sale.id || 0;
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
    const [results] = await database.executeSql(
      'SELECT * FROM sales WHERE date BETWEEN ? AND ? ORDER BY date DESC',
      [startDate, endDate]
    );
    
    const sales: Sale[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      sales.push(results.rows.item(i));
    }
    
    return sales;
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
    const [results] = await database.executeSql(
      'SELECT SUM(total) as total FROM sales WHERE date LIKE ?',
      [`${today}%`]
    );
    
    return results.rows.item(0).total || 0;
  } catch (error) {
    console.error('Error al obtener total de ventas:', error);
    throw error;
  }
};

