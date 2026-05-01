import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/dpa")({
  head: () => ({
    meta: [
      { title: "Data Processing & Sub-processors — RecipesHub" },
      { name: "description", content: "Who processes your data on our behalf." },
    ],
  }),
  component: DPAPage,
});

function DPAPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert">
      <h1 className="font-display text-4xl mb-2">Data Processing & Sub-processors</h1>

      <p>
        Where RecipesHub acts as a data <strong>processor</strong> (e.g. when a Business
        plan customer uses the Service for their team), the relevant Data Processing
        Agreement (DPA) is governed by EU Standard Contractual Clauses (Commission
        Implementing Decision 2021/915) and incorporated into our Terms.
      </p>

      <h2>Sub-processors we use</h2>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Region</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Lovable Cloud</td>
            <td>Application hosting, database, authentication, file storage</td>
            <td>EU / EEA</td>
          </tr>
          <tr>
            <td>Lovable AI Gateway</td>
            <td>AI-assisted features (only when invoked)</td>
            <td>EU / EEA</td>
          </tr>
        </tbody>
      </table>

      <p>
        We will publish material changes to this list at least 30 days in advance. If you
        require a signed DPA for your Business plan, contact us via the{" "}
        <Link to="/legal/imprint">Imprint</Link> page.
      </p>
    </article>
  );
}
