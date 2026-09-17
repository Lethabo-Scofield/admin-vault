const ITEM_COLORS = [
  "bg-blue-50 text-blue-700 ring-blue-100",
  "bg-violet-50 text-violet-700 ring-violet-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-amber-50 text-amber-700 ring-amber-100",
  "bg-rose-50 text-rose-700 ring-rose-100",
  "bg-cyan-50 text-cyan-700 ring-cyan-100",
] as const;

export function parseListItems(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(/[\n,;]+/)
    .map((item) =>
      item
        .trim()
        .replace(/^(?:[-*•▪◦‣–—]\s*|\d+[.)]\s*)/, "")
        .trim()
    )
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
}

export function normalizeList(value: string): string {
  return parseListItems(value).join("\n");
}

export function itemColor(index: number): string {
  return ITEM_COLORS[index % ITEM_COLORS.length];
}