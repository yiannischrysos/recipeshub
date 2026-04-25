import jsPDF from "jspdf";
import { fmtMoney } from "@/lib/format";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  allergens: string[];
  dietary: string[];
};
type Line = {
  ingredient_id: string;
  quantity: number;
  unit_override: string | null;
  ingredient_note: string | null;
};
type Step = {
  step_number: number;
  description: string;
  estimated_time: number | null;
  time_unit: string | null;
  degrees: string | null;
};
type Recipe = {
  name: string;
  family: string | null;
  category: string | null;
  description: string | null;
  yield_portions: number;
  margin_pct: number;
  dietary: string[];
  source: string | null;
  source_url: string | null;
};

export function downloadRecipePdf(opts: {
  recipe: Recipe;
  lines: Line[];
  steps: Step[];
  ingMap: Record<string, Ingredient>;
  totals: { totalCost: number; perPortion: number; suggested: number; profit: number };
  allergens: string[];
}) {
  const { recipe, lines, steps, ingMap, totals, allergens } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const text = (s: string, x: number, opts2?: { size?: number; bold?: boolean; color?: [number, number, number] }) => {
    doc.setFont("helvetica", opts2?.bold ? "bold" : "normal");
    doc.setFontSize(opts2?.size ?? 10);
    const c = opts2?.color ?? [30, 25, 20];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(s, x, y);
  };

  // Header
  doc.setFillColor(247, 240, 230);
  doc.rect(0, 0, pageW, 90, "F");
  y = 50;
  text(recipe.name, margin, { size: 22, bold: true, color: [70, 40, 20] });
  y += 18;
  const meta: string[] = [];
  if (recipe.family) meta.push(recipe.family);
  if (recipe.category) meta.push(recipe.category);
  meta.push(`${recipe.yield_portions} portion${recipe.yield_portions === 1 ? "" : "s"}`);
  text(meta.join("  ·  "), margin, { size: 10, color: [120, 100, 80] });
  y = 110;

  if (recipe.description) {
    const lines2 = doc.splitTextToSize(recipe.description, pageW - margin * 2);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(80, 70, 60);
    doc.text(lines2, margin, y);
    y += lines2.length * 13 + 8;
  }

  // Tags row
  const tags: string[] = [];
  recipe.dietary.forEach((d) => tags.push(d));
  allergens.forEach((a) => tags.push(`Contains: ${a}`));
  if (tags.length) {
    text(tags.join("  •  "), margin, { size: 9, color: [120, 90, 60] });
    y += 16;
  }

  // Costing box
  ensureSpace(70);
  doc.setDrawColor(220, 200, 180);
  doc.setFillColor(252, 248, 242);
  doc.roundedRect(margin, y, pageW - margin * 2, 60, 6, 6, "FD");
  const colW = (pageW - margin * 2) / 4;
  const labels = ["Total cost", "Per portion", "Suggested price", "Profit / portion"];
  const values = [totals.totalCost, totals.perPortion, totals.suggested, totals.profit];
  labels.forEach((lbl, i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 110, 80);
    doc.text(lbl.toUpperCase(), margin + 12 + colW * i, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(70, 40, 20);
    doc.text(fmtMoney(values[i]), margin + 12 + colW * i, y + 42);
  });
  y += 80;

  // Ingredients
  ensureSpace(40);
  text("Ingredients", margin, { size: 14, bold: true, color: [70, 40, 20] });
  y += 8;
  doc.setDrawColor(220, 200, 180);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  lines.forEach((l) => {
    ensureSpace(18);
    const ing = ingMap[l.ingredient_id];
    if (!ing) return;
    const qty = `${l.quantity} ${l.unit_override ?? ing.unit}`;
    const cost = (Number(l.quantity) || 0) * Number(ing.cost_per_unit ?? 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 30, 20);
    doc.text(qty, margin, y);
    doc.setFont("helvetica", "normal");
    const nameStr = ing.name + (l.ingredient_note ? `  (${l.ingredient_note})` : "");
    doc.text(nameStr, margin + 90, y);
    doc.setTextColor(140, 110, 80);
    doc.text(fmtMoney(cost), pageW - margin, y, { align: "right" });
    y += 16;
  });

  y += 10;

  // Method
  ensureSpace(40);
  text("Method", margin, { size: 14, bold: true, color: [70, 40, 20] });
  y += 8;
  doc.setDrawColor(220, 200, 180);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  steps.forEach((s, i) => {
    const numStr = `${i + 1}.`;
    const extras: string[] = [];
    if (s.estimated_time && s.time_unit) extras.push(`${s.estimated_time} ${s.time_unit}`);
    if (s.degrees) extras.push(s.degrees);
    const body = s.description + (extras.length ? `  [${extras.join(" · ")}]` : "");
    const wrapped = doc.splitTextToSize(body, pageW - margin * 2 - 28);
    ensureSpace(wrapped.length * 13 + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(170, 100, 40);
    doc.text(numStr, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 30, 20);
    doc.text(wrapped, margin + 22, y);
    y += wrapped.length * 13 + 6;
  });

  // Footer with source
  if (recipe.source || recipe.source_url) {
    ensureSpace(30);
    y = Math.max(y, pageH - margin - 20);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(140, 120, 100);
    const src = [recipe.source, recipe.source_url].filter(Boolean).join(" — ");
    doc.text(`Source: ${src}`, margin, pageH - margin);
  }

  const safeName = recipe.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "recipe";
  doc.save(`${safeName}.pdf`);
}
