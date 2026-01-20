import { SaleItem } from './SaleItem';
import { PaymentMethod } from './CashSession';

export interface Sale {
  id?: number;
  total: number;
  date: string;
  user_id?: number;
  username?: string; // Para mostrar en recibo (join con users)
  cash_session_id?: number;
  table_order_id?: number; // Para trazabilidad de pedidos de mesa
  payment_method: PaymentMethod;
  // Campos para pago mixto
  cash_amount?: number; // Monto en efectivo (para pagos mixtos)
  transfer_amount?: number; // Monto en transferencia (para pagos mixtos)
  // Campos para vuelto
  received_amount?: number; // Monto recibido del cliente
  change_amount?: number; // Vuelto calculado
  sale_type?: 'normal' | 'house'; // Tipo de salida: normal (venta) o house (cuenta casa)
  notes?: string; // Notas/justificación para salidas de cuenta casa
  voided_at?: string;
  voided_by_user_id?: number;
  void_reason?: string;
  created_at?: string;
  items?: SaleItem[];
}

