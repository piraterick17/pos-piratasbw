/*
  # Fix RLS policy for stock movements

  1. Security Changes
    - Drop the existing restrictive INSERT policy that requires 'stock.gestionar' permission
    - Create a new INSERT policy that allows all authenticated users to create stock movements
    - Keep the existing SELECT policy for reading movements

  This change allows authenticated users to manage stock movements without requiring
  a specific permission system, which aligns with the current application design
  where all authenticated users can manage products and their stock.
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Permitir inserción de movimientos a admins" ON movimientos_stock;

-- Create a new INSERT policy that allows authenticated users
CREATE POLICY "Permitir inserción de movimientos a usuarios autenticados"
  ON movimientos_stock
  FOR INSERT
  TO authenticated
  WITH CHECK (true);