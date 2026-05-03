
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS shared_recipe_snapshot jsonb;
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS shared_recipe_snapshot jsonb;
