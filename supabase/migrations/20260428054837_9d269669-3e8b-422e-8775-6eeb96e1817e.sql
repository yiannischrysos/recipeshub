
-- BLOCKS
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own blocks" ON public.blocks FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
CREATE POLICY "create own blocks" ON public.blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "delete own blocks" ON public.blocks FOR DELETE USING (auth.uid() = blocker_id);

CREATE INDEX idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);

-- Helper: are two users blocking each other in any direction?
CREATE OR REPLACE FUNCTION public.is_blocked_between(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

-- Helper: are two users friends?
CREATE OR REPLACE FUNCTION public.are_friends(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_a = LEAST(_a,_b) AND user_b = GREATEST(_a,_b))
  );
$$;

-- CONVERSATIONS (1:1)
CREATE TYPE public.conversation_status AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL,
  user_b UUID NOT NULL,
  initiator_id UUID NOT NULL,
  status public.conversation_status NOT NULL DEFAULT 'pending',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "create conversations as participant" ON public.conversations FOR INSERT
  WITH CHECK ((auth.uid() = user_a OR auth.uid() = user_b) AND auth.uid() = initiator_id AND NOT public.is_blocked_between(user_a, user_b));
CREATE POLICY "update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  shared_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (content IS NOT NULL OR shared_recipe_id IS NOT NULL)
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);

CREATE POLICY "view messages in own conversations" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b))
);

CREATE POLICY "send messages in own conversations" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)
      AND NOT public.is_blocked_between(c.user_a, c.user_b)
      AND (c.status = 'accepted' OR c.initiator_id = auth.uid())
  )
);

CREATE POLICY "update read state in own conversations" ON public.messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b))
);

-- Update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_conversation AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- Auto-accept conversation if users are friends
CREATE OR REPLACE FUNCTION public.auto_accept_friend_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.are_friends(NEW.user_a, NEW.user_b) THEN
    NEW.status := 'accepted';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_accept_conv BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.auto_accept_friend_conversation();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
