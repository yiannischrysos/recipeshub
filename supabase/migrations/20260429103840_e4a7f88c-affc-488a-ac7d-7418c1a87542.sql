-- 1) Add 'business' tier to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'business';

-- 2) Favorites (recipes + ingredients)
CREATE TABLE IF NOT EXISTS public.favorite_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);
ALTER TABLE public.favorite_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own favorite recipes" ON public.favorite_recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "add own favorite recipes" ON public.favorite_recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "remove own favorite recipes" ON public.favorite_recipes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.favorite_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ingredient_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ingredient_id)
);
ALTER TABLE public.favorite_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own favorite ingredients" ON public.favorite_ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "add own favorite ingredients" ON public.favorite_ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "remove own favorite ingredients" ON public.favorite_ingredients FOR DELETE USING (auth.uid() = user_id);

-- 3) Reactions on DM messages
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view reactions in own conversations" ON public.message_reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
  )
);
CREATE POLICY "add own reactions in own conversations" ON public.message_reactions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
  )
);
CREATE POLICY "remove own reactions" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);

-- 4) Reactions on group messages
CREATE TABLE IF NOT EXISTS public.group_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view group reactions" ON public.group_message_reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    WHERE gm.id = group_message_reactions.message_id AND public.is_group_member(gm.group_id, auth.uid())
  )
);
CREATE POLICY "members add own group reactions" ON public.group_message_reactions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.group_messages gm
    WHERE gm.id = group_message_reactions.message_id AND public.is_group_member(gm.group_id, auth.uid())
  )
);
CREATE POLICY "remove own group reactions" ON public.group_message_reactions FOR DELETE USING (auth.uid() = user_id);

-- 5) Group invites
CREATE TYPE public.invite_status AS ENUM ('pending','accepted','declined');
CREATE TABLE IF NOT EXISTS public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status public.invite_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, invitee_id, status)
);
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own invites" ON public.group_invites FOR SELECT USING (
  auth.uid() = invitee_id OR auth.uid() = inviter_id OR public.is_group_member(group_id, auth.uid())
);
CREATE POLICY "send invites with permission" ON public.group_invites FOR INSERT WITH CHECK (
  auth.uid() = inviter_id AND (
    public.is_group_owner(group_id, auth.uid()) OR public.group_member_has_perm(group_id, auth.uid(), 'can_invite')
  )
);
CREATE POLICY "respond to own invites" ON public.group_invites FOR UPDATE USING (auth.uid() = invitee_id);
CREATE POLICY "cancel invites" ON public.group_invites FOR DELETE USING (
  auth.uid() = inviter_id OR auth.uid() = invitee_id OR public.is_group_owner(group_id, auth.uid())
);

-- Trigger: when invite accepted -> add member with default role
CREATE OR REPLACE FUNCTION public.handle_group_invite_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE default_role UUID;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT id INTO default_role FROM public.group_roles WHERE group_id = NEW.group_id AND is_default = true LIMIT 1;
    INSERT INTO public.group_members (group_id, user_id, role_id)
    VALUES (NEW.group_id, NEW.invitee_id, default_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_group_invite_accepted AFTER UPDATE ON public.group_invites
FOR EACH ROW EXECUTE FUNCTION public.handle_group_invite_accepted();

-- Trigger: notify invitee on new invite
CREATE OR REPLACE FUNCTION public.notify_group_invite()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inviter_name TEXT; group_name TEXT;
BEGIN
  SELECT COALESCE(nickname, display_name, 'Someone') INTO inviter_name FROM public.profiles WHERE id = NEW.inviter_id;
  SELECT name INTO group_name FROM public.groups WHERE id = NEW.group_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
  VALUES (NEW.invitee_id, 'group_invite', 'Group invite',
          inviter_name || ' invited you to ' || COALESCE(group_name,'a group'),
          '/groups/' || NEW.group_id, NEW.inviter_id);
  RETURN NEW;
END $$;

-- Add 'group_invite' to notification_type enum if it's an enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'group_invite';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
