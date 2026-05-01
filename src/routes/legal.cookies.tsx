import { createFileRoute, Link } from "@tanstack/react-router";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies & Local Storage — RecipesHub" },
      { name: "description", content: "What we store on your device and why." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert">
      <h1 className="font-display text-4xl mb-2">Cookies & Local Storage</h1>
      <p className="text-sm text-muted-foreground">
        Version {LEGAL_VERSIONS.cookies} · Effective 1 May 2026
      </p>

      <h2>What we store</h2>
      <p>
        RecipesHub currently uses only <strong>strictly-necessary</strong> browser storage.
        Under the EU ePrivacy Directive, strictly-necessary storage does not require prior
        consent — but we still disclose it for transparency.
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-*-auth-token</td>
            <td>localStorage</td>
            <td>Keeps you signed in</td>
            <td>Until sign-out</td>
          </tr>
          <tr>
            <td>cookie-notice-dismissed</td>
            <td>localStorage</td>
            <td>Remembers you dismissed the notice</td>
            <td>Persistent</td>
          </tr>
        </tbody>
      </table>

      <h2>What we do NOT use</h2>
      <ul>
        <li>No advertising cookies.</li>
        <li>No third-party analytics or tracking pixels.</li>
        <li>No cross-site tracking.</li>
      </ul>

      <p>
        If we add analytics or marketing cookies in the future, we will request your consent
        beforehand through a granular cookie banner. See our{" "}
        <Link to="/legal/privacy">Privacy Policy</Link> for full details.
      </p>
    </article>
  );
}
