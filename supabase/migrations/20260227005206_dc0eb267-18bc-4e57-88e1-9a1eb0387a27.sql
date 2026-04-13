
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update the trigger function to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, section, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'section',
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'));

  RETURN NEW;
END;
$$;

-- Allow authenticated users to read all profiles (for login dropdown)
-- Drop restrictive policies and recreate
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Everyone authenticated can read profiles (needed for login dropdown showing names)
CREATE POLICY "Authenticated can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Also allow anon to read name+id for login dropdown
CREATE POLICY "Anon can read profiles for login"
ON public.profiles FOR SELECT TO anon
USING (true);
