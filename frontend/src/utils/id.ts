let counter = 0;

// Compact, sortable-ish unique id generator (no uuid dependency available
// offline). Format: <prefix>-<base36 time>-<counter>-<random>.
export function generateId(prefix = "id"): string {
  counter += 1;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${time}-${counter.toString(36)}-${rand}`;
}
