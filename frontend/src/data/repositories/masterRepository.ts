import type { MasterData } from "../../types";
import { SEED_MASTER_DATA } from "../seed/masterData";
import { RETIRED_DOCUMENT_IDS } from "../seed/documentDefinitions";
import { readJSON, writeJSON } from "../storageAdapter";

const KEY = "master";

function load(): MasterData {
  return readJSON<MasterData>(KEY, SEED_MASTER_DATA);
}
function save(data: MasterData): void {
  writeJSON(KEY, data);
}

// Master data IS user-editable (Master Data screen), so unlike documents it
// can't simply be overwritten from the seed. Instead, new seed rows are
// merged in additively by id: an employee / holiday / chemical the seed
// knows about but the stored copy doesn't gets added, everything the admin
// already has (including their edits to seeded rows) is left alone, and
// role-keyword defaults are only filled in for documents that have no entry
// yet. That's how an existing install gains the lamination staff and the
// new documents' reminder assignments without losing local changes.
export function ensureSeeded(): void {
  const raw = readJSON<MasterData | null>(KEY, null as unknown as MasterData);
  if (!raw) {
    save(SEED_MASTER_DATA);
    return;
  }
  let changed = false;
  const mergeById = <T extends { id: string }>(current: T[] | undefined, seed: T[]): T[] => {
    const list = current ?? [];
    const ids = new Set(list.map((x) => x.id));
    const additions = seed.filter((x) => !ids.has(x.id));
    if (additions.length > 0) changed = true;
    return additions.length ? [...list, ...additions] : list;
  };
  const next: MasterData = {
    ...raw,
    employees: mergeById(raw.employees, SEED_MASTER_DATA.employees),
    chemicals: mergeById(raw.chemicals, SEED_MASTER_DATA.chemicals),
    holidays: mergeById(raw.holidays, SEED_MASTER_DATA.holidays),
    areas: mergeById(raw.areas, SEED_MASTER_DATA.areas),
    pcLocations: mergeById(raw.pcLocations, SEED_MASTER_DATA.pcLocations),
    serviceTypeChemicals: mergeById(raw.serviceTypeChemicals, SEED_MASTER_DATA.serviceTypeChemicals),
    rodentStations: raw.rodentStations ?? [],
    checkpoints: raw.checkpoints?.length ? raw.checkpoints : SEED_MASTER_DATA.checkpoints,
    documentRoleKeywords: { ...raw.documentRoleKeywords },
  };
  for (const [docId, keyword] of Object.entries(SEED_MASTER_DATA.documentRoleKeywords)) {
    if (next.documentRoleKeywords[docId] === undefined) {
      next.documentRoleKeywords[docId] = keyword;
      changed = true;
    }
  }
  // A retired document's reminder assignment has nothing left to point at.
  for (const docId of RETIRED_DOCUMENT_IDS) {
    if (next.documentRoleKeywords[docId] !== undefined) {
      delete next.documentRoleKeywords[docId];
      changed = true;
    }
  }
  if (changed) save(next);
}

export const masterRepository = {
  get(): MasterData {
    return load();
  },
  update(patch: Partial<MasterData>): MasterData {
    const next = { ...load(), ...patch };
    save(next);
    return next;
  },
  resetToSeed(): void {
    save(SEED_MASTER_DATA);
  },
};
