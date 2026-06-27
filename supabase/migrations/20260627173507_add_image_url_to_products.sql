/*
# Agregar columna image_url a products

## Descripción
Agrega una columna `image_url` a la tabla `products` para almacenar la URL
de la imagen descriptiva del producto (subida a Supabase Storage).

## Cambios
- Nueva columna `image_url` (text, nullable) en `products`.
- No hay cambios de seguridad (RLS ya está habilitado en products).
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
