import type { DocumentDefinition } from "../../types";
import { RETIRED_DOCUMENT_IDS, SEED_DOCUMENTS } from "../seed/documentDefinitions";
import { readJSON, writeJSON } from "../storageAdapter";

const KEY = "documents";

function loadAll(): DocumentDefinition[] {
  return readJSON<DocumentDefinition[]>(KEY, []);
}

function saveAll(docs: DocumentDefinition[]): void {
  writeJSON(KEY, docs);
}

// Document definitions are configuration, not user data (nothing in the UI
// edits them), so the seed list is always authoritative: every boot
// re-syncs it by id. That's what lets a browser that already used the app
// pick up newly digitized formats (e.g. the lamination QC/production log
// sheets added from "Audit documents.zip") and schedule changes (Training
// moving from As Required to Yearly) without anyone clearing localStorage.
// Any definition that isn't in the seed is kept untouched — unless it has
// been explicitly retired (RETIRED_DOCUMENT_IDS), in which case it is
// dropped so a withdrawn document doesn't keep generating records.
export function ensureSeeded(): void {
  const existing = loadAll();
  const seedIds = new Set(SEED_DOCUMENTS.map((d) => d.id));
  const retired = new Set(RETIRED_DOCUMENT_IDS);
  const extras = existing.filter((d) => !seedIds.has(d.id) && !retired.has(d.id));
  const next = [...SEED_DOCUMENTS, ...extras];
  if (JSON.stringify(next) !== JSON.stringify(existing)) saveAll(next);
}

export const documentRepository = {
  getAll(): DocumentDefinition[] {
    return loadAll();
  },
  getById(id: string): DocumentDefinition | undefined {
    return loadAll().find((d) => d.id === id);
  },
  getRecordable(): DocumentDefinition[] {
    return loadAll().filter((d) => !d.isReferenceOnly);
  },
  upsert(doc: DocumentDefinition): void {
    const all = loadAll();
    const idx = all.findIndex((d) => d.id === doc.id);
    if (idx >= 0) all[idx] = doc;
    else all.push(doc);
    saveAll(all);
  },
  resetToSeed(): void {
    saveAll(SEED_DOCUMENTS);
  },
};
