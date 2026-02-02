/*
  # Remove problematic trigger from auth.users

  ## Issue
  The trigger `on_auth_user_created_notification_config` is causing 
  "Database error creating new user" when using auth.admin.createUser() 
  via Edge Functions. This happens because the trigger runs within the 
  auth transaction and can fail due to RLS/context issues.

  ## Solution
  Remove this trigger. The notification config will be created manually 
  in the Edge Function after the user is successfully created.

  ## Changes
  1. Drop the trigger from auth.users
  2. Keep the function for manual use if needed
*/

-- Remove the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created_notification_config ON auth.users;
