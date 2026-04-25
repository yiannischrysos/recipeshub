
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  default_margin_pct NUMERIC NOT NULL DEFAULT 70,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ingredients
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,                 -- g, kg, ml, L, unit, etc.
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,    -- price per 1 unit (e.g. per gram)
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ingredients select" ON public.ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own ingredients insert" ON public.ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ingredients update" ON public.ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own ingredients delete" ON public.ingredients FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER ingredients_updated BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX ingredients_user_idx ON public.ingredients(user_id);

-- Recipes
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,                  -- e.g. Cake, Bread, Pastry
  description TEXT,
  yield_portions INTEGER NOT NULL DEFAULT 1,
  margin_pct NUMERIC NOT NULL DEFAULT 70,   -- target food cost margin %
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recipes select" ON public.recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own recipes insert" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own recipes update" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own recipes delete" ON public.recipes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER recipes_updated BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX recipes_user_idx ON public.recipes(user_id);

-- Recipe ingredients (line items)
CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL DEFAULT 0,    -- in the ingredient's base unit
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
-- Access via parent recipe ownership
CREATE POLICY "own recipe_ing select" ON public.recipe_ingredients FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "own recipe_ing insert" ON public.recipe_ingredients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "own recipe_ing update" ON public.recipe_ingredients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "own recipe_ing delete" ON public.recipe_ingredients FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE INDEX recipe_ing_recipe_idx ON public.recipe_ingredients(recipe_id);
