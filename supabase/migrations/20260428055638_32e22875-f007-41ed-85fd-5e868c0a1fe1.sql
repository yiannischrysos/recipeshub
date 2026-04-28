
-- ============ FRIEND REQUEST FIX ============
-- Allow re-sending after a decline by removing old declined rows when sending again,
-- and prevent duplicate pending rows with a partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_friend_request
  ON public.friend_requests (sender_id, receiver_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.cleanup_old_friend_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- If a non-pending row exists for this pair (any direction), delete it so a new request can be made
  DELETE FROM public.friend_requests
  WHERE status <> 'pending'
    AND (
      (sender_id = NEW.sender_id AND receiver_id = NEW.receiver_id)
      OR (sender_id = NEW.receiver_id AND receiver_id = NEW.sender_id)
    );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cleanup_old_friend_request ON public.friend_requests;
CREATE TRIGGER trg_cleanup_old_friend_request
  BEFORE INSERT ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_old_friend_request();

-- ============ GROUPS ============
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  can_invite BOOLEAN NOT NULL DEFAULT false,
  can_kick BOOLEAN NOT NULL DEFAULT false,
  can_manage_roles BOOLEAN NOT NULL DEFAULT false,
  can_manage_notes BOOLEAN NOT NULL DEFAULT false,
  can_mention_all BOOLEAN NOT NULL DEFAULT false,
  can_edit_group BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, name)
);
ALTER TABLE public.group_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_id UUID REFERENCES public.group_roles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  shared_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  mentions UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (content IS NOT NULL OR shared_recipe_id IS NOT NULL)
);
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_group_messages_group ON public.group_messages(group_id, created_at DESC);

CREATE TABLE public.group_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.group_notes ENABLE ROW LEVEL SECURITY;

-- ============ Helpers ============
CREATE OR REPLACE FUNCTION public.is_group_member(_gid UUID, _uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _gid AND user_id = _uid);
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(_gid UUID, _uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = _gid AND owner_id = _uid);
$$;

CREATE OR REPLACE FUNCTION public.group_member_has_perm(_gid UUID, _uid UUID, _perm TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v BOOLEAN;
BEGIN
  IF public.is_group_owner(_gid, _uid) THEN RETURN true; END IF;
  EXECUTE format(
    'SELECT COALESCE(bool_or(r.%I), false) FROM public.group_members m JOIN public.group_roles r ON r.id = m.role_id WHERE m.group_id = $1 AND m.user_id = $2',
    _perm
  ) INTO v USING _gid, _uid;
  RETURN COALESCE(v, false);
END;
$$;

-- ============ RLS POLICIES ============
-- groups
CREATE POLICY "view groups i'm in" ON public.groups FOR SELECT USING (public.is_group_member(id, auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner edits group" ON public.groups FOR UPDATE USING (auth.uid() = owner_id OR public.group_member_has_perm(id, auth.uid(), 'can_edit_group'));
CREATE POLICY "owner deletes group" ON public.groups FOR DELETE USING (auth.uid() = owner_id);

-- group_roles
CREATE POLICY "members view roles" ON public.group_roles FOR SELECT USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "manage roles" ON public.group_roles FOR INSERT WITH CHECK (public.group_member_has_perm(group_id, auth.uid(), 'can_manage_roles'));
CREATE POLICY "update roles" ON public.group_roles FOR UPDATE USING (public.group_member_has_perm(group_id, auth.uid(), 'can_manage_roles'));
CREATE POLICY "delete roles" ON public.group_roles FOR DELETE USING (public.group_member_has_perm(group_id, auth.uid(), 'can_manage_roles'));

-- group_members
CREATE POLICY "members view members" ON public.group_members FOR SELECT USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "invite or self-join after creation" ON public.group_members FOR INSERT WITH CHECK (
  -- The owner or someone with can_invite can add anyone; or owner adds themselves at creation
  public.is_group_owner(group_id, auth.uid())
  OR public.group_member_has_perm(group_id, auth.uid(), 'can_invite')
);
CREATE POLICY "kick or leave" ON public.group_members FOR DELETE USING (
  user_id = auth.uid() -- can leave
  OR public.is_group_owner(group_id, auth.uid())
  OR public.group_member_has_perm(group_id, auth.uid(), 'can_kick')
);
CREATE POLICY "update member role" ON public.group_members FOR UPDATE USING (
  public.group_member_has_perm(group_id, auth.uid(), 'can_manage_roles')
);

-- group_messages
CREATE POLICY "members read messages" ON public.group_messages FOR SELECT USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "members send messages" ON public.group_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND public.is_group_member(group_id, auth.uid())
);

-- group_notes
CREATE POLICY "members read notes" ON public.group_notes FOR SELECT USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "create notes" ON public.group_notes FOR INSERT WITH CHECK (
  auth.uid() = author_id AND (public.is_group_owner(group_id, auth.uid()) OR public.group_member_has_perm(group_id, auth.uid(), 'can_manage_notes'))
);
CREATE POLICY "update notes" ON public.group_notes FOR UPDATE USING (
  public.is_group_owner(group_id, auth.uid()) OR public.group_member_has_perm(group_id, auth.uid(), 'can_manage_notes')
);
CREATE POLICY "delete notes" ON public.group_notes FOR DELETE USING (
  public.is_group_owner(group_id, auth.uid()) OR public.group_member_has_perm(group_id, auth.uid(), 'can_manage_notes')
);

-- timestamps
CREATE TRIGGER trg_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_group_notes_updated_at BEFORE UPDATE ON public.group_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-bootstrap a new group: create default Member role + add owner as member
CREATE OR REPLACE FUNCTION public.bootstrap_group()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE member_role_id UUID;
BEGIN
  INSERT INTO public.group_roles (group_id, name, is_default)
  VALUES (NEW.id, 'Member', true)
  RETURNING id INTO member_role_id;

  INSERT INTO public.group_members (group_id, user_id, role_id)
  VALUES (NEW.id, NEW.owner_id, member_role_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bootstrap_group AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_group();

-- ============ NOTIFICATIONS ============
CREATE TYPE public.notif_type AS ENUM (
  'mention', 'friend_request', 'friend_accepted', 'follow', 'dm', 'group_invite', 'announcement'
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.notif_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  actor_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

CREATE POLICY "view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mark own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
-- INSERT done by triggers (security definer); no direct insert policy needed.

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'update',
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "everyone reads announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins create announcements" ON public.announcements FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update announcements" ON public.announcements FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete announcements" ON public.announcements FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Fan out announcement -> notifications for every existing user
CREATE OR REPLACE FUNCTION public.fanout_announcement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
  SELECT p.id, 'announcement', NEW.title, NEW.body, '/announcements', NEW.author_id
  FROM public.profiles p;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_fanout_announcement AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.fanout_announcement();

-- ============ AUTOMATIC NOTIFICATIONS ============
-- Friend request received
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name TEXT;
BEGIN
  SELECT COALESCE(nickname, display_name, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
  VALUES (NEW.receiver_id, 'friend_request', 'New friend request',
          sender_name || ' wants to be your friend', '/profile?u=' || NEW.sender_id, NEW.sender_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_friend_request AFTER INSERT ON public.friend_requests
  FOR EACH ROW WHEN (NEW.status = 'pending') EXECUTE FUNCTION public.notify_friend_request();

-- Friend request accepted
CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE receiver_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT COALESCE(nickname, display_name, 'Someone') INTO receiver_name FROM public.profiles WHERE id = NEW.receiver_id;
    INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
    VALUES (NEW.sender_id, 'friend_accepted', 'Friend request accepted',
            receiver_name || ' accepted your friend request', '/profile?u=' || NEW.receiver_id, NEW.receiver_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_friend_accepted AFTER UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_accepted();

-- New follower
CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE follower_name TEXT;
BEGIN
  SELECT COALESCE(nickname, display_name, 'Someone') INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
  VALUES (NEW.following_id, 'follow', 'New follower',
          follower_name || ' started following you', '/profile?u=' || NEW.follower_id, NEW.follower_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

-- Direct message received
CREATE OR REPLACE FUNCTION public.notify_dm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name TEXT; recipient UUID; conv RECORD;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN conv.user_a = NEW.sender_id THEN conv.user_b ELSE conv.user_a END;
  SELECT COALESCE(nickname, display_name, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
  VALUES (recipient, 'dm', 'New message from ' || sender_name,
          COALESCE(LEFT(NEW.content, 120), 'Sent you a recipe'), '/messages', NEW.sender_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_dm AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_dm();

-- Mentions in group messages
CREATE OR REPLACE FUNCTION public.notify_group_mentions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name TEXT; group_name TEXT; uid UUID;
BEGIN
  IF array_length(NEW.mentions, 1) IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(nickname, display_name, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT name INTO group_name FROM public.groups WHERE id = NEW.group_id;
  FOREACH uid IN ARRAY NEW.mentions LOOP
    IF uid <> NEW.sender_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, actor_id)
      VALUES (uid, 'mention', sender_name || ' mentioned you in ' || group_name,
              COALESCE(LEFT(NEW.content, 120), ''), '/groups/' || NEW.group_id, NEW.sender_id);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_group_mentions AFTER INSERT ON public.group_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_mentions();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_notes;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;
ALTER TABLE public.group_notes REPLICA IDENTITY FULL;
