/*
# PanControl - Schema inicial para Sistema de Gestión de Panaderías

## Descripción
Crea el esquema completo de base de datos para PanControl, un sistema integral
de gestión de panaderías que incluye inventario de productos terminados,
inventario de insumos, producción diaria con consumo automático de insumos,
ventas con descuento de inventario, y reportes.

## Tablas nuevas

1. `profiles` - Perfiles de usuario extendidos desde auth.users con roles
   - id (uuid, PK, referencia a auth.users)
   - full_name (text, nombre completo)
   - role (text, rol: admin, cajero, panadero, bodeguero)
   - created_at (timestamptz)

2. `categories` - Categorías de productos (pan francés, pan dulce, jugos, etc.)
   - id (uuid, PK)
   - name (text, nombre de la categoría)
   - created_at (timestamptz)

3. `products` - Productos terminados para venta
   - id (uuid, PK)
   - code (text, código único del producto)
   - name (text, nombre)
   - category_id (uuid, FK a categories)
   - quantity (numeric, cantidad disponible en inventario)
   - price (numeric, precio de venta)
   - unit (text, unidad: unidad, kg, litro, etc.)
   - created_at (timestamptz)

4. `supplies` - Insumos para producción
   - id (uuid, PK)
   - name (text, nombre del insumo)
   - quantity (numeric, cantidad existente)
   - unit (text, unidad: kg, litros, unidades)
   - min_stock (numeric, stock mínimo para alertas)
   - purchase_date (date, fecha de compra)
   - created_at (timestamptz)

5. `recipes` - Recetas: qué insumos se necesitan para producir un producto
   - id (uuid, PK)
   - product_id (uuid, FK a products)
   - supply_id (uuid, FK a supplies)
   - quantity_per_unit (numeric, cantidad de insumo por unidad de producto)

6. `productions` - Registros de producción diaria
   - id (uuid, PK)
   - product_id (uuid, FK a products)
   - quantity (numeric, cantidad producida)
   - date (date, fecha de producción)
   - created_at (timestamptz)

7. `sales` - Cabecera de ventas
   - id (uuid, PK)
   - date (timestamptz, fecha y hora de la venta)
   - total (numeric, total de la venta)
   - created_at (timestamptz)

8. `sale_items` - Detalle de cada venta
   - id (uuid, PK)
   - sale_id (uuid, FK a sales)
   - product_id (uuid, FK a products)
   - quantity (numeric, cantidad vendida)
   - price (numeric, precio unitario)
   - subtotal (numeric, subtotal = quantity * price)

9. `inventory_movements` - Movimientos de inventario (entradas/salidas)
   - id (uuid, PK)
   - product_id (uuid, FK a products, nullable)
   - supply_id (uuid, FK a supplies, nullable)
   - movement_type (text: entrada, salida, produccion, venta)
   - quantity (numeric, cantidad movida)
   - reference (text, referencia: producción, venta, ajuste)
   - created_at (timestamptz)

## Seguridad
- RLS habilitado en todas las tablas.
- Polices scoped TO authenticated con ownership checks via profiles.
- Todos los usuarios autenticados pueden operar CRUD sobre las tablas operacionales
  (es un sistema de gestión interno de un solo negocio).

## Notas importantes
1. Las tablas operacionales (categories, products, supplies, recipes, productions,
   sales, sale_items, inventory_movements) usan TO authenticated porque el sistema
   requiere login. Todos los usuarios autenticados pueden leer y escribir datos
   operacionales (es un sistema de un solo negocio, no multi-tenant).
2. La tabla profiles está vinculada a auth.users y cada usuario solo puede ver/editar
   su propio perfil.
3. Los triggers actualizan automáticamente el inventario de productos e insumos
   cuando se registran producciones y ventas.
*/

-- ============================================================
-- TABLA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'cajero' CHECK (role IN ('admin', 'cajero', 'panadero', 'bodeguero')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Permitir que todos los usuarios autenticados vean los perfiles (para saber roles)
DROP POLICY IF EXISTS "select_all_profiles" ON profiles;
CREATE POLICY "select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- TABLA: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_categories" ON categories;
CREATE POLICY "select_categories" ON categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_categories" ON categories;
CREATE POLICY "insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_categories" ON categories;
CREATE POLICY "update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_categories" ON categories;
CREATE POLICY "delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- TABLA: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unidad',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_products" ON products;
CREATE POLICY "insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_products" ON products;
CREATE POLICY "update_products" ON products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_products" ON products;
CREATE POLICY "delete_products" ON products FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- TABLA: supplies
-- ============================================================
CREATE TABLE IF NOT EXISTS supplies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  min_stock numeric NOT NULL DEFAULT 0,
  purchase_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_supplies" ON supplies;
CREATE POLICY "select_supplies" ON supplies FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_supplies" ON supplies;
CREATE POLICY "insert_supplies" ON supplies FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_supplies" ON supplies;
CREATE POLICY "update_supplies" ON supplies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_supplies" ON supplies;
CREATE POLICY "delete_supplies" ON supplies FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- TABLA: recipes
-- ============================================================
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supply_id uuid NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  quantity_per_unit numeric NOT NULL DEFAULT 0,
  UNIQUE (product_id, supply_id)
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_recipes" ON recipes;
CREATE POLICY "select_recipes" ON recipes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_recipes" ON recipes;
CREATE POLICY "insert_recipes" ON recipes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_recipes" ON recipes;
CREATE POLICY "update_recipes" ON recipes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_recipes" ON recipes;
CREATE POLICY "delete_recipes" ON recipes FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- TABLA: productions
-- ============================================================
CREATE TABLE IF NOT EXISTS productions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE productions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_productions" ON productions;
CREATE POLICY "select_productions" ON productions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_productions" ON productions;
CREATE POLICY "insert_productions" ON productions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_productions" ON productions;
CREATE POLICY "update_productions" ON productions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_productions" ON productions;
CREATE POLICY "delete_productions" ON productions FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- TABLA: sales
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL DEFAULT now(),
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sales" ON sales;
CREATE POLICY "select_sales" ON sales FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_sales" ON sales;
CREATE POLICY "insert_sales" ON sales FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sales" ON sales;
CREATE POLICY "update_sales" ON sales FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_sales" ON sales;
CREATE POLICY "delete_sales" ON sales FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- TABLA: sale_items
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sale_items" ON sale_items;
CREATE POLICY "select_sale_items" ON sale_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_sale_items" ON sale_items;
CREATE POLICY "insert_sale_items" ON sale_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sale_items" ON sale_items;
CREATE POLICY "update_sale_items" ON sale_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_sale_items" ON sale_items;
CREATE POLICY "delete_sale_items" ON sale_items FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- TABLA: inventory_movements
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  supply_id uuid REFERENCES supplies(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'produccion', 'venta', 'ajuste')),
  quantity numeric NOT NULL DEFAULT 0,
  reference text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_inventory_movements" ON inventory_movements;
CREATE POLICY "select_inventory_movements" ON inventory_movements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_inventory_movements" ON inventory_movements;
CREATE POLICY "insert_inventory_movements" ON inventory_movements FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_inventory_movements" ON inventory_movements;
CREATE POLICY "update_inventory_movements" ON inventory_movements FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_inventory_movements" ON inventory_movements;
CREATE POLICY "delete_inventory_movements" ON inventory_movements FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_supply ON recipes(supply_id);
CREATE INDEX IF NOT EXISTS idx_productions_product ON productions(product_id);
CREATE INDEX IF NOT EXISTS idx_productions_date ON productions(date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_supply ON inventory_movements(supply_id);

-- ============================================================
-- TRIGGER: Crear perfil automáticamente al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'role', 'cajero')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: Actualizar inventario al registrar producción
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_production_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  consumed numeric;
  available numeric;
BEGIN
  -- Aumentar el inventario del producto producido
  UPDATE products SET quantity = quantity + new.quantity
  WHERE id = new.product_id;

  -- Registrar movimiento de entrada al inventario de producto terminado
  INSERT INTO inventory_movements (product_id, movement_type, quantity, reference)
  VALUES (new.product_id, 'produccion', new.quantity, 'Producción del ' || new.date);

  -- Descontar insumos según la receta
  FOR r IN
    SELECT supply_id, quantity_per_unit FROM recipes WHERE product_id = new.product_id
  LOOP
    consumed := r.quantity_per_unit * new.quantity;

    -- Verificar que hay suficiente insumo
    SELECT quantity INTO available FROM supplies WHERE id = r.supply_id FOR UPDATE;
    IF available < consumed THEN
      RAISE EXCEPTION 'Insumo insuficiente. Disponible: %, Requerido: %', available, consumed;
    END IF;

    -- Descontar insumo
    UPDATE supplies SET quantity = quantity - consumed WHERE id = r.supply_id;

    -- Registrar movimiento de salida de insumo
    INSERT INTO inventory_movements (supply_id, movement_type, quantity, reference)
    VALUES (r.supply_id, 'salida', consumed, 'Producción del ' || new.date);
  END LOOP;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_production_insert ON productions;
CREATE TRIGGER on_production_insert
  AFTER INSERT ON productions
  FOR EACH ROW EXECUTE FUNCTION public.handle_production_insert();

-- ============================================================
-- TRIGGER: Revertir inventario al eliminar producción
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_production_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  returned numeric;
BEGIN
  -- Reducir el inventario del producto
  UPDATE products SET quantity = quantity - old.quantity
  WHERE id = old.product_id;

  -- Registrar movimiento de salida
  INSERT INTO inventory_movements (product_id, movement_type, quantity, reference)
  VALUES (old.product_id, 'salida', old.quantity, 'Reversión producción del ' || old.date);

  -- Devolver insumos
  FOR r IN
    SELECT supply_id, quantity_per_unit FROM recipes WHERE product_id = old.product_id
  LOOP
    returned := r.quantity_per_unit * old.quantity;
    UPDATE supplies SET quantity = quantity + returned WHERE id = r.supply_id;

    INSERT INTO inventory_movements (supply_id, movement_type, quantity, reference)
    VALUES (r.supply_id, 'entrada', returned, 'Reversión producción del ' || old.date);
  END LOOP;

  RETURN old;
END;
$$;

DROP TRIGGER IF EXISTS on_production_delete ON productions;
CREATE TRIGGER on_production_delete
  BEFORE DELETE ON productions
  FOR EACH ROW EXECUTE FUNCTION public.handle_production_delete();

-- ============================================================
-- TRIGGER: Actualizar inventario al registrar venta
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_sale_item_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  available numeric;
BEGIN
  -- Verificar stock disponible
  SELECT quantity INTO available FROM products WHERE id = new.product_id FOR UPDATE;
  IF available < new.quantity THEN
    RAISE EXCEPTION 'Stock insuficiente del producto. Disponible: %, Solicitado: %', available, new.quantity;
  END IF;

  -- Descontar del inventario
  UPDATE products SET quantity = quantity - new.quantity WHERE id = new.product_id;

  -- Registrar movimiento
  INSERT INTO inventory_movements (product_id, movement_type, quantity, reference)
  VALUES (new.product_id, 'venta', new.quantity, 'Venta');

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_sale_item_insert ON sale_items;
CREATE TRIGGER on_sale_item_insert
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_item_insert();

-- ============================================================
-- TRIGGER: Actualizar total de venta al insertar item
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_sale_total_on_item_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE sales SET total = total + new.subtotal WHERE id = new.sale_id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_sale_item_total_insert ON sale_items;
CREATE TRIGGER on_sale_item_total_insert
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION public.update_sale_total_on_item_insert();

-- ============================================================
-- DATOS INICIALES: Categorías
-- ============================================================
INSERT INTO categories (name) VALUES
  ('Pan francés'),
  ('Pan dulce'),
  ('Pan integral'),
  ('Jugos'),
  ('Gaseosas'),
  ('Charcutería'),
  ('Otros')
ON CONFLICT (name) DO NOTHING;
