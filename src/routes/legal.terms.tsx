import { createFileRoute, Link } from "@tanstack/react-router";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — RecipesHub" },
      { name: "description", content: "The legal agreement between you and RecipesHub when you use the service." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert">
      <h1 className="font-display text-4xl mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Version {LEGAL_VERSIONS.terms} · Effective 1 May 2026
      </p>

      <h2>1. Acceptance</h2>
      <p>
        By creating an account or using RecipesHub (the “Service”) you agree to these Terms
        and to our <Link to="/legal/privacy">Privacy Policy</Link>. If you do not agree, do
        not use the Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least <strong>16 years old</strong> to create an account. By signing
        up you confirm that you meet this requirement.
      </p>

      <h2>3. Your account</h2>
      <ul>
        <li>You are responsible for keeping your credentials confidential.</li>
        <li>You must provide accurate information.</li>
        <li>One person may not create multiple accounts to abuse the Service.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Upload illegal, infringing, hateful, harassing, or sexually explicit content.</li>
        <li>Send spam, malware, or attempt to breach the Service’s security.</li>
        <li>Scrape, reverse-engineer or build a competing product from our data.</li>
        <li>Impersonate another person or misrepresent your affiliation.</li>
      </ul>
      <p>
        We may suspend or terminate accounts that violate these rules, with or without notice.
      </p>

      <h2>5. Your content</h2>
      <p>
        You retain ownership of recipes, ingredients and messages you create. You grant us a
        limited, worldwide, royalty-free licence to host, store, transmit and display this
        content solely for the purpose of operating the Service for you.
      </p>

      <h2>6. Plans & payments</h2>
      <p>
        The Service offers Free, Premium and Business plans. Paid plans are billed as
        described on the <Link to="/pricing">pricing page</Link>. EU consumers have a 14-day
        right of withdrawal under Directive 2011/83/EU; by starting paid use you may waive
        this right for already-delivered digital services. Refunds outside the statutory
        period are at our discretion.
      </p>

      <h2>7. Service availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service. We may
        change, suspend or discontinue features with reasonable notice.
      </p>

      <h2>8. Disclaimer & liability</h2>
      <p>
        The Service is provided “as is”. To the maximum extent permitted by law, we exclude
        all implied warranties. Nothing in these Terms limits liability for fraud, gross
        negligence, or any liability that cannot be excluded under EU consumer law. For all
        other liability, our aggregate liability is limited to the fees you paid in the
        12 months before the event giving rise to the claim, or €100 — whichever is greater.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may delete your account at any time from your <Link to="/profile">profile</Link>.
        Upon deletion, your personal data is removed in accordance with our Privacy Policy.
      </p>

      <h2>10. Governing law & disputes</h2>
      <p>
        These Terms are governed by the laws of the European Union and the member state
        where the operator is established. EU consumers may also rely on mandatory consumer
        protection laws of their country of residence and access the EU Online Dispute
        Resolution platform at{" "}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
          ec.europa.eu/consumers/odr
        </a>.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these Terms. Material changes will be notified in advance and require
        renewed acceptance.
      </p>
    </article>
  );
}
