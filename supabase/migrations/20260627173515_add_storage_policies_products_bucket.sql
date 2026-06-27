/*
# Políticas de Storage para bucket 'products'

## Descripción
Permite a usuarios autenticados subir, leer y eliminar imágenes
en el bucket público 'products' de Supabase Storage.

## Políticas
- SELECT: cualquier usuario autenticado puede ver las imágenes (bucket público).
- INSERT: usuarios autenticados pueden subir imágenes.
- UPDATE: usuarios autenticados pueden actualizar imágenes.
- DELETE: usuarios autenticados pueden eliminar imágenes.
*/

DROP POLICY IF EXISTS "select_product_images" ON storage.objects;
CREATE POLICY "select_product_images" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'products');

DROP POLICY IF EXISTS "insert_product_images" ON storage.objects;
CREATE POLICY "insert_product_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'products');

DROP POLICY IF EXISTS "update_product_images" ON storage.objects;
CREATE POLICY "update_product_images" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'products') WITH CHECK (bucket_id = 'products');

DROP POLICY IF EXISTS "delete_product_images" ON storage.objects;
CREATE POLICY "delete_product_images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'products');
