export interface User {
  id?: number;
  username: string;
  role: 'admin' | 'seller';
  pin_salt?: string;
  pin_hash?: string;
  is_active: number;
  created_at?: string;
}

