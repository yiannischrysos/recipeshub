-- Migrate existing 'user' rows to 'free'
UPDATE public.user_roles SET role = 'free' WHERE role = 'user';

-- Update new-user trigger to default to 'free'
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;