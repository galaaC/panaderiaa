import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'admin' | 'empleado';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category_id: string | null;
  quantity: number;
  price: number;
  unit: string;
  image_url: string | null;
  created_at: string;
  category?: Category | null;
}

export interface Supply {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock: number;
  purchase_date: string | null;
  created_at: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  supply_id: string;
  quantity_per_unit: number;
  product?: Product | null;
  supply?: Supply | null;
}

export interface Production {
  id: string;
  product_id: string;
  quantity: number;
  date: string;
  created_at: string;
  product?: Product | null;
}

export interface Sale {
  id: string;
  date: string;
  total: number;
  created_at: string;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: Product | null;
}

export interface InventoryMovement {
  id: string;
  product_id: string | null;
  supply_id: string | null;
  movement_type: string;
  quantity: number;
  reference: string | null;
  created_at: string;
  product?: Product | null;
  supply?: Supply | null;
}
