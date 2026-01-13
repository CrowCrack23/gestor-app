import { SaleItem } from './SaleItem';

export interface Sale {
  id?: number;
  total: number;
  date: string;
  created_at?: string;
  items?: SaleItem[];
}

