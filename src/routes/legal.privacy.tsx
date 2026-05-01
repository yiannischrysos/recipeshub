import { createFileRoute, Link } from "@tanstack/react-router";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — RecipesHub" },
      { name: "description", content: "How RecipesHub collects, uses and protects your personal data under GDPR." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert">
      <h1 className="font-display text-4xl mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Version {LEGAL_VERSIONS.privacy} · Effective 1 May 2026
      </p>

      <h2>1. Who we are</h2>
      <p>
        RecipesHub (“we”, “us”) is the controller of personal data processed through this
        application. For privacy questions, contact us at the email shown on our{" "}
        <Link to="/legal/imprint">Imprint</Link> page.
      </p>

      <h2>2. What data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email, password (hashed), display name.</li>
        <li><strong>Profile (optional):</strong> nickname, avatar, bio, gender, date of birth, preferred currency.</li>
        <li><strong>Content:</strong> recipes, ingredients, notes, favorites you create.</li>
        <li><strong>Communications:</strong> private messages, group messages, reactions, friend/group invites.</li>
        <li><strong>Technical:</strong> IP address (transiently, for security/abuse prevention), browser user-agent, presence (online/last seen), timestamps.</li>
        <li><strong>Consent records:</strong> which version of our Terms, Privacy Policy and age confirmation you accepted, and when.</li>
      </ul>

      <h2>3. Why we process it (purposes & legal bases — GDPR Art. 6)</h2>
      <ul>
        <li><strong>Performance of contract (Art. 6(1)(b)):</strong> creating your account, storing your recipes, delivering messages.</li>
        <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> security, fraud and abuse prevention, service improvement.</li>
        <li><strong>Consent (Art. 6(1)(a)):</strong> optional profile fields you choose to display (gender, age), and any future marketing communications.</li>
        <li><strong>Legal obligation (Art. 6(1)(c)):</strong> retaining records required by law (e.g. invoices once payments are enabled).</li>
      </ul>

      <h2>4. Who we share it with (sub-processors)</h2>
      <p>We do not sell personal data. We use the following processors:</p>
      <ul>
        <li><strong>Lovable Cloud</strong> (managed backend & database hosting) — EU/EEA region.</li>
        <li><strong>Lovable AI Gateway</strong> (only when you use AI-assisted features).</li>
      </ul>
      <p>See our <Link to="/legal/dpa">Data Processing</Link> page for the full list.</p>

      <h2>5. International transfers</h2>
      <p>
        Where data is transferred outside the EEA, we rely on EU Standard Contractual Clauses
        and adequacy decisions. Our primary processing region is the EU.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>Account data: until you delete your account.</li>
        <li>Recipes / ingredients / favorites: until you delete them or your account.</li>
        <li>Messages: until you or the other participant deletes them, or your account is deleted.</li>
        <li>Consent records: 6 years after deletion, to comply with our accountability obligation (GDPR Art. 5(2)).</li>
        <li>Backups: rotated within 30 days.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>Under GDPR you have the right to:</p>
      <ul>
        <li><strong>Access</strong> (Art. 15) — request a copy of your data. Use the “Export my data” button in your <Link to="/profile">profile</Link>.</li>
        <li><strong>Rectification</strong> (Art. 16) — correct inaccurate data via your profile.</li>
        <li><strong>Erasure</strong> (Art. 17) — delete your account from your profile.</li>
        <li><strong>Restriction</strong> (Art. 18) and <strong>objection</strong> (Art. 21).</li>
        <li><strong>Portability</strong> (Art. 20) — receive your data in JSON format.</li>
        <li><strong>Withdraw consent</strong> at any time, where processing is based on consent.</li>
        <li><strong>Lodge a complaint</strong> with your local supervisory authority (e.g. the Hellenic DPA in Greece).</li>
      </ul>

      <h2>8. Security</h2>
      <p>
        Data is encrypted in transit (TLS) and at rest. Access is enforced through row-level
        security policies — users can only access their own records. Passwords are hashed
        using industry-standard algorithms.
      </p>

      <h2>9. Children</h2>
      <p>
        RecipesHub is intended for users <strong>16 years or older</strong>. We do not
        knowingly collect data from children under 16. If you believe a child has created
        an account, contact us and we will delete it.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We will notify you of material changes by email or in-app banner before they take
        effect. The current version is shown at the top of this page.
      </p>
    </article>
  );
}
