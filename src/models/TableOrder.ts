import { TableOrderItem } from './TableOrderItem';

export type TableOrderStatus = 'open' | 'closed';

export interface TableOrder {
  id?: number;
  table_number: number;
  status: TableOrderStatus;
  subtotal: number;
  opened_at: string;
  opened_by_user_id?: number;
  opened_by_username?: string;
  cash_session_id?: number;
  created_at?: string;
  items?: TableOrderItem[];
}
