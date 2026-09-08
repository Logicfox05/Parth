// Master / reference data. All seeded strictly from the uploaded source
// documents (see REQUIREMENTS.md for provenance of every row). The admin can
// add more rows later from the Master Data screen; nothing here is invented
// historical data.

export interface Employee {
  id: string;
  name: string;
  role: string; // e.g. "Checker", "Verifier", "Technician", "Client Contact"
  department?: string;
  active: boolean;
  email?: string; // needed to receive reminder digests — blank until an admin sets it
}

export interface AreaLocation {
  id: string;
  name: string;
  context: string; // which document's area-list this belongs to
  floor?: string;
}

export interface PCLocation {
  id: string; // "PC-01" .. "PC-13"
  location: string;
  floor: string; // "GF" | "FF" | TBC
}

export interface Chemical {
  id: string;
  name: string;
  activeIngredient?: string;
  formulation?: string;
}

export interface ServiceTypeChemical {
  id: string;
  serviceName: string; // e.g. "Rodent Control Service"
  pestCovered: string;
  chemicals: string[];
  dilutionRatio: string;
}

export interface RodentStation {
  id: string;
  location: string;
  type: "Tamper Proof Bait Station" | "Glue Board / Glue Trap" | "Bait Tray" | "TO BE CONFIRMED";
  status: "Active" | "Inactive" | "TO BE CONFIRMED";
}

export interface CompanyHoliday {
  id: string;
  date: string; // ISO "YYYY-MM-DD"
  name: string;
}

export interface MasterData {
  employees: Employee[];
  areas: AreaLocation[];
  pcLocations: PCLocation[];
  chemicals: Chemical[];
  serviceTypeChemicals: ServiceTypeChemical[];
  rodentStations: RodentStation[];
  checkpoints: DailyCheckpointDef[];
  // Reminder assignment: DocumentDefinition.id -> a substring to match against
  // Employee.role (case-insensitive). Whoever matches is "the concerned
  // person" for that document's due-date reminders. Editable in Master Data;
  // read defensively (`?? {}`) since browsers that used the app before this
  // field existed won't have it in their stored data.
  documentRoleKeywords: Record<string, string>;
  // Company-wide holidays — checked when generating a new Daily Monitoring
  // record's default isHoliday flag, and when deciding whether a due/overdue
  // reminder should fire (see src/engine/recordDefaults.ts,
  // src/engine/reminders.ts). Read defensively (`?? []`) for the same
  // pre-existing-data reason as documentRoleKeywords above.
  holidays: CompanyHoliday[];
}

export type CheckpointResponseType = "yesno" | "yesno-note" | "number";

export interface DailyCheckpointDef {
  no: number;
  text: string; // verbatim source wording
  responseType: CheckpointResponseType;
  notePrompt?: string; // e.g. "mention the location"
  // Which Yes/No answer represents a finding (needs a corrective action
  // logged below) — polarity differs per checkpoint, e.g. checkpoint 1
  // ("pest proofing working properly") is bad when answered "No", while
  // checkpoint 2 ("any gaps...") is bad when answered "Yes". Absent for the
  // one numeric checkpoint (#4), which has nothing to flag.
  flagWhen?: "Yes" | "No";
}
