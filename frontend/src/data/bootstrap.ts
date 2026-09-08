import { ensureSeeded as ensureDocsSeeded } from "./repositories/documentRepository";
import { ensureSeeded as ensureMasterSeeded } from "./repositories/masterRepository";
import { ensureSeeded as ensureRecordsSeeded } from "./repositories/recordRepository";
import { ensureRecordsGeneratedForMonth } from "../engine/recordGenerator";
import { prepareDueRecords } from "../engine/assistantPrepare";
import { todayISO } from "../utils/date";

// Called once on app start. Seeds / re-syncs master, document and historical
// data (see each repository's ensureSeeded for the merge rules), makes sure
// the current month's recurring records exist, and then has the assistant
// fill in everything that is due today or earlier — so by the time the
// Dashboard renders, the user's records are already prepared and waiting
// for a review rather than sitting empty.
export function bootstrap(): void {
  ensureDocsSeeded();
  ensureMasterSeeded();
  ensureRecordsSeeded();

  const today = new Date(todayISO());
  ensureRecordsGeneratedForMonth(today.getFullYear(), today.getMonth(), { isDemo: false });
  prepareDueRecords();
}
