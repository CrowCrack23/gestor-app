export interface TableOrderItem {
  id?: number;
  table_order_id?: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
}
