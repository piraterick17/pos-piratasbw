/*
  # Fix notificaciones_config RLS for service_role

  ## Issue
  When creating users via Edge Function using service_role, the trigger 
  on auth.users fails because auth.uid() is NULL and RLS policies block the insert.

  ## Changes
  1. Add policy to allow service_role to insert into notificaciones_config
  2. This allows the trigger to work when creating users via admin API

  ## Security
  - Only service_role can bypass the auth.uid() check
  - Regular authenticated users still need auth.uid() = user_id
*/

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Service role can insert notification configs" ON notificaciones_config;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow service_role to insert notification configs for any user
CREATE POLICY "Service role can insert notification configs"
  ON notificaciones_config
  FOR INSERT
  TO service_role
  WITH CHECK (true);
