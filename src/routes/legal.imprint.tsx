import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/imprint")({
  head: () => ({
    meta: [
      { title: "Imprint — RecipesHub" },
      { name: "description", content: "Legal information about the operator of RecipesHub." },
    ],
  }),
  component: ImprintPage,
});

function ImprintPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert">
      <h1 className="font-display text-4xl mb-2">Imprint / Legal Notice</h1>
      <p className="text-sm text-muted-foreground">Information pursuant to EU transparency requirements.</p>

      <h2>Operator</h2>
      <p>
        <strong>[Your full legal name or company name]</strong><br />
        [Street address]<br />
        [Postal code, City]<br />
        [Country, EU member state]
      </p>

      <h2>Contact</h2>
      <p>
        Email: <em>(the email tied to your RecipesHub account)</em><br />
        For privacy requests, please use the same address with subject “Privacy”.
      </p>

      <h2>Commercial register</h2>
      <p>[If applicable: registry, registration number, VAT ID]</p>

      <h2>Responsible for content</h2>
      <p>[Name of person responsible for editorial content]</p>

      <hr />
      <p className="text-xs text-muted-foreground">
        ⚠️ This is a template — please replace bracketed fields with your actual legal
        information before going live. Some EU member states (notably Germany under §5 TMG)
        require this page to be reachable in two clicks from any page.
      </p>
    </article>
  );
}
