import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { SaleItem } from '../models/SaleItem';
import { PaymentMethod } from '../models/CashSession';
import { getCurrentDateTime } from '../utils/formatters';
import * as db from './database';

/**
 * Procesa una venta completa o salida de cuenta casa
 */
export const processSale = async (
  items: SaleItem[], 
  userId?: number,
  paymentMethod: PaymentMethod = 'cash',
  cashSessionId?: number,
  tableOrderId?: number,
  saleType: 'normal' | 'house' = 'normal',
  notes?: string
): Promise<Sale> => {
  if (items.length === 0) {
    throw new Error('No hay productos en la venta');
  }

  // Calcular total
  let total = items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Si es cuenta casa, el total es 0
  if (saleType === 'house') {
    total = 0;
  }

  // Crear la venta
  const sale: Sale = {
    total,
    date: getCurrentDateTime(),
    user_id: userId,
    payment_method: saleType === 'house' ? 'cash' : paymentMethod, // Cuenta casa siempre cash por defecto
    cash_session_id: saleType === 'house' ? undefined : cashSessionId, // Cuenta casa no requiere sesión
    table_order_id: tableOrderId,
    sale_type: saleType,
    notes: notes,
  };

  // Guardar en la base de datos
  const saleId = await db.createSale(sale, items);
  sale.id = saleId;
  sale.items = items;

  return sale;
};

/**
 * Calcula el subtotal de un item
 */
export const calculateSubtotal = (price: number, quantity: number): number => {
  return price * quantity;
};

/**
 * Valida si hay suficiente stock para un producto
 */
export const validateStock = async (productId: number, quantity: number): Promise<boolean> => {
  const product = await db.getProductById(productId);
  
  if (!product) {
    return false;
  }

  return product.stock >= quantity;
};

/**
 * Crea un item de venta a partir de un producto
 */
export const createSaleItemFromProduct = (
  product: Product,
  quantity: number
): SaleItem => {
  return {
    product_id: product.id!,
    product_name: product.name,
    quantity,
    price: product.price,
    subtotal: calculateSubtotal(product.price, quantity),
  };
};

