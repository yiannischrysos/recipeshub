-- Legal consent audit trail (GDPR requirement: prove what version each user accepted and when)
CREATE TABLE public.legal_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document TEXT NOT NULL, -- 'terms' | 'privacy' | 'cookies' | 'age_16'
  version TEXT NOT NULL,  -- e.g. '2026-05-01'
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  UNIQUE (user_id, document, version)
);

CREATE INDEX idx_legal_consents_user ON public.legal_consents(user_id);

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

-- Users can view and insert their own consent records
CREATE POLICY "view own consents"
  ON public.legal_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "record own consents"
  ON public.legal_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all (for compliance audits)
CREATE POLICY "admins view all consents"
  ON public.legal_consents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Account deletion request queue (when user requests deletion, admin/edge fn processes it)
-- Using a request table lets us soft-handle the auth.users delete (which requires service role)
CREATE TABLE public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' -- 'pending' | 'processed' | 'cancelled'
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request own deletion"
  ON public.account_deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "view own deletion request"
  ON public.account_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cancel own pending deletion"
  ON public.account_deletion_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "admins manage deletion requests"
  ON public.account_deletion_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
