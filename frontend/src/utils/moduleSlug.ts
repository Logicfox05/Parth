// Turns a DocumentDefinition.module name into a URL-safe slug for
// /library/{slug} deep links (used by the sidebar's module links and by the
// assistant's navigate action) — "Lamination — Quality Control" becomes
// "lamination-quality-control".
export function moduleSlug(module: string): string {
  return module
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
