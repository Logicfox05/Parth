import type { DailyCheckpointDef } from "../types";

// A checkpoint's "bad" answer differs per question (e.g. checkpoint 1 is a
// finding when answered "No", checkpoint 2 when answered "Yes" — see
// DailyCheckpointDef.flagWhen). Centralized here so the record view, the
// Daily Monitoring Summary report, and the demo data generator can't drift
// out of sync on what counts as a finding.
export function isCheckpointFinding(cp: DailyCheckpointDef, value: string | number | null | undefined): boolean {
  return cp.flagWhen !== undefined && value === cp.flagWhen;
}

export function countFindings(
  checkpointDefs: DailyCheckpointDef[],
  answers: Record<number, { value: string | number | null } | undefined>
): number {
  return checkpointDefs.filter((cp) => isCheckpointFinding(cp, answers[cp.no]?.value)).length;
}
