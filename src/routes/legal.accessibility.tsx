import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility Statement — RecipesHub" },
      { name: "description", content: "Our commitment to digital accessibility under the EU Accessibility Act." },
    ],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 prose prose-sm dark:prose-invert">
      <h1 className="font-display text-4xl mb-2">Accessibility Statement</h1>
      <p className="text-sm text-muted-foreground">Last updated 1 May 2026</p>

      <p>
        RecipesHub is committed to making its application accessible in line with the
        <strong> European Accessibility Act</strong> (Directive (EU) 2019/882, in force
        since 28 June 2025) and aims for substantial conformance with{" "}
        <strong>WCAG 2.1 Level AA</strong>.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Semantic HTML and proper heading structure.</li>
        <li>Keyboard-navigable interactive elements with visible focus rings.</li>
        <li>Sufficient colour contrast in both light and dark themes.</li>
        <li>Form fields with associated labels and clear error messages.</li>
        <li>Responsive layouts down to 320 px width.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>
        Some recipe images uploaded by users may lack alternative text. We are working with
        the community to improve this and provide guidance during upload.
      </p>

      <h2>Feedback</h2>
      <p>
        If you encounter an accessibility barrier, please report it via the{" "}
        <Link to="/legal/imprint">contact details</Link> on our Imprint page. We aim to
        respond within 14 days.
      </p>
    </article>
  );
}
