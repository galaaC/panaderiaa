/*
# Simplificar roles a admin y empleado + permitir admin gestione perfiles

## Descripción
Cambia el sistema de roles de 4 valores (admin, cajero, panadero, bodeguero)
a solo 2 valores: admin y empleado. El administrador podrá designar empleados
y cambiar sus roles desde el panel.

## Cambios
1. Modificar el constraint de `role` en `profiles` para aceptar solo 'admin' y 'empleado'.
2. Migrar roles existentes: cajero, panadero, bodeguero → 'empleado'.
3. Actualizar política de UPDATE en `profiles` para permitir que el admin
   edite cualquier perfil (no solo el propio).

## Notas
- No se pierden datos: los roles existentes se convierten a 'empleado'.
- El admin puede cambiar el rol de cualquier usuario entre 'admin' y 'empleado'.
- Cada usuario sigue pudiendo editar su propio perfil.
*/

-- Migrar roles existentes a 'empleado' (excepto admin)
UPDATE profiles SET role = 'empleado' WHERE role IN ('cajero', 'panadero', 'bodeguero');

-- Reemplazar el constraint de rol
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'empleado'));

-- Política: el admin puede actualizar cualquier perfil
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "update_any_profile" ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Política: el admin puede eliminar perfiles (desactivar empleados)
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
