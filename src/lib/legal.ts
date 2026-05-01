// Bump these versions when the corresponding policy changes.
// Users will be re-prompted to accept on next sign-in.
export const LEGAL_VERSIONS = {
  terms: "2026-05-01",
  privacy: "2026-05-01",
  cookies: "2026-05-01",
  age_16: "2026-05-01",
} as const;

export const LEGAL_CONTACT_EMAIL_FALLBACK = "your-account-email@example.com";

export type LegalDocument = keyof typeof LEGAL_VERSIONS;
