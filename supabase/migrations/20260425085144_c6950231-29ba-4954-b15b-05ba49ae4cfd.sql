
-- Ingredients: extra metadata
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS allergens TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary TEXT[] NOT NULL DEFAULT '{}';

-- Recipes: family grouping, source, dietary, parent
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS family TEXT,
  ADD COLUMN IF NOT EXISTS recipe_order INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS dietary TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recipes_family_idx ON public.recipes(user_id, family);
CREATE INDEX IF NOT EXISTS recipes_parent_idx ON public.recipes(parent_id);

-- Recipe ingredients: per-line unit & note (so the same Ingredient can be used as Gramms or Piece(s) etc.)
ALTER TABLE public.recipe_ingredients
  ADD COLUMN IF NOT EXISTS unit_override TEXT,
  ADD COLUMN IF NOT EXISTS ingredient_note TEXT;

-- Method steps
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  estimated_time NUMERIC,
  time_unit TEXT,
  degrees TEXT,
  fan_power TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own steps select" ON public.recipe_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "own steps insert" ON public.recipe_steps FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "own steps update" ON public.recipe_steps FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "own steps delete" ON public.recipe_steps FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS recipe_steps_recipe_idx ON public.recipe_steps(recipe_id, step_number);
