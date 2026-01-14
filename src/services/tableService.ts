import { TableOrder, TableOrderStatus } from '../models/TableOrder';
import { TableOrderItem } from '../models/TableOrderItem';
import { Sale } from '../models/Sale';
import { SaleItem } from '../models/SaleItem';
import { PaymentMethod } from '../models/CashSession';
import { Product } from '../models/Product';
import { getCurrentDateTime } from '../utils/formatters';
import * as db from './database';
import * as salesService from './salesService';

/**
 * Abre una nueva mesa con un pedido vacío
 */
export const openTable = async (
  tableNumber: number,
  userId?: number,
  cashSessionId?: number
): Promise<number> => {
  try {
    const tableOrder: TableOrder = {
      table_number: tableNumber,
      status: 'open',
      subtotal: 0,
      opened_at: getCurrentDateTime(),
      opened_by_user_id: userId,
      cash_session_id: cashSessionId,
    };

    const tableOrderId = await db.createTableOrder(tableOrder);
    return tableOrderId;
  } catch (error) {
    console.error('Error al abrir mesa:', error);
    throw error;
  }
};

/**
 * Agrega un producto al pedido de una mesa
 */
export const addProductToTable = async (
  tableOrderId: number,
  product: Product,
  quantity: number
): Promise<void> => {
  try {
    // Validar stock
    if (quantity > product.stock) {
      throw new Error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
    }

    const item: TableOrderItem = {
      table_order_id: tableOrderId,
      product_id: product.id!,
      product_name: product.name,
      quantity,
      price: product.price,
      subtotal: product.price * quantity,
    };

    await db.addTableOrderItem(tableOrderId, item);
  } catch (error) {
    console.error('Error al agregar producto a la mesa:', error);
    throw error;
  }
};

/**
 * Actualiza la cantidad de un item en el pedido
 */
export const updateTableItemQuantity = async (
  itemId: number,
  quantity: number
): Promise<void> => {
  try {
    if (quantity <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }

    await db.updateTableOrderItem(itemId, quantity);
  } catch (error) {
    console.error('Error al actualizar cantidad:', error);
    throw error;
  }
};

/**
 * Elimina un item del pedido
 */
export const removeTableItem = async (itemId: number): Promise<void> => {
  try {
    await db.deleteTableOrderItem(itemId);
  } catch (error) {
    console.error('Error al eliminar item:', error);
    throw error;
  }
};

/**
 * Cobra un pedido de mesa y lo convierte en venta
 */
export const checkoutTable = async (
  tableOrderId: number,
  paymentMethod: PaymentMethod,
  userId?: number,
  cashSessionId?: number
): Promise<Sale> => {
  try {
    // Obtener el pedido con sus items
    const tableOrder = await db.getTableOrderById(tableOrderId);
    
    if (!tableOrder) {
      throw new Error('Pedido de mesa no encontrado');
    }

    if (!tableOrder.items || tableOrder.items.length === 0) {
      throw new Error('El pedido no tiene productos');
    }

    // Convertir items de mesa a items de venta
    const saleItems: SaleItem[] = tableOrder.items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    // Validar stock antes de procesar
    for (const item of saleItems) {
      const hasStock = await salesService.validateStock(item.product_id, item.quantity);
      if (!hasStock) {
        throw new Error(`Stock insuficiente para ${item.product_name}`);
      }
    }

    // Procesar la venta incluyendo la referencia al pedido de mesa
    const sale = await salesService.processSale(
      saleItems,
      userId,
      paymentMethod,
      cashSessionId,
      tableOrderId
    );

    // Cerrar el pedido de mesa
    await db.closeTableOrder(tableOrderId);

    return sale;
  } catch (error) {
    console.error('Error al cobrar mesa:', error);
    throw error;
  }
};

/**
 * Cancela un pedido de mesa sin generar venta
 */
export const cancelTable = async (tableOrderId: number): Promise<void> => {
  try {
    await db.cancelTableOrder(tableOrderId);
  } catch (error) {
    console.error('Error al cancelar mesa:', error);
    throw error;
  }
};

/**
 * Obtiene el estado de todas las mesas (configurado por número máximo)
 */
export const getTablesStatus = async (maxTables: number = 20): Promise<Array<{
  tableNumber: number;
  isOccupied: boolean;
  tableOrder?: TableOrder;
}>> => {
  try {
    // Obtener todos los pedidos activos
    const activeOrders = await db.getAllTableOrders();

    // Crear mapa de mesas ocupadas
    const occupiedMap = new Map<number, TableOrder>();
    activeOrders.forEach(order => {
      occupiedMap.set(order.table_number, order);
    });

    // Generar estado de todas las mesas
    const tablesStatus = [];
    for (let i = 1; i <= maxTables; i++) {
      const tableOrder = occupiedMap.get(i);
      tablesStatus.push({
        tableNumber: i,
        isOccupied: !!tableOrder,
        tableOrder,
      });
    }

    return tablesStatus;
  } catch (error) {
    console.error('Error al obtener estado de mesas:', error);
    throw error;
  }
};

/**
 * Calcula el subtotal de un pedido
 */
export const calculateTableSubtotal = (items: TableOrderItem[]): number => {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
};
