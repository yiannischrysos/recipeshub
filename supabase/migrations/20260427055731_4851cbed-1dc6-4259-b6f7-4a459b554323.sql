-- Add avatar_icon column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_icon text;

-- Add new enum values (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'free';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'premium';