export interface CashSession {
  id?: number;
  opened_at: string;
  closed_at?: string;
  opened_by_user_id: number;
  closed_by_user_id?: number;
  opening_cash: number;
  declared_cash?: number;
  declared_card?: number;
  declared_transfer?: number;
  sales_cash_total: number;
  sales_card_total: number;
  sales_transfer_total: number;
  notes?: string;
  created_at?: string;
  // Datos calculados (no en BD)
  diff_cash?: number;
  diff_card?: number;
  diff_transfer?: number;
  diff_total?: number;
  // Join con users
  opened_by_username?: string;
  closed_by_username?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer';

