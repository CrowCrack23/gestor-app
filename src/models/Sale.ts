import { SaleItem } from './SaleItem';
import { PaymentMethod } from './CashSession';

export interface Sale {
  id?: number;
  total: number;
  date: string;
  user_id?: number;
  username?: string; // Para mostrar en recibo (join con users)
  cash_session_id?: number;
  payment_method: PaymentMethod;
  voided_at?: string;
  voided_by_user_id?: number;
  void_reason?: string;
  created_at?: string;
  items?: SaleItem[];
}

