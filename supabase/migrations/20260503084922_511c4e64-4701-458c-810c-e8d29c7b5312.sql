
-- DM messages: new columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shared_ingredient_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Allow sender to delete own DM
DROP POLICY IF EXISTS "delete own messages" ON public.messages;
CREATE POLICY "delete own messages" ON public.messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Group messages: new columns
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.group_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shared_ingredient_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Allow sender to update / delete their own group messages
DROP POLICY IF EXISTS "edit own group messages" ON public.group_messages;
CREATE POLICY "edit own group messages" ON public.group_messages
  FOR UPDATE USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "delete own group messages" ON public.group_messages;
CREATE POLICY "delete own group messages" ON public.group_messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Group read receipts
CREATE TABLE IF NOT EXISTS public.group_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gmr_group ON public.group_message_reads (group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gmr_message ON public.group_message_reads (message_id);

ALTER TABLE public.group_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own/group reads" ON public.group_message_reads
  FOR SELECT USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "members mark own reads" ON public.group_message_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_group_member(group_id, auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_message_reads;
