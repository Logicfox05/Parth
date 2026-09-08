import type { RecordStatus } from "./common";

// ---- Generic record envelope --------------------------------------------
// One RecordInstance = one cell in the Document -> Frequency -> Date -> Record
// chain. `data` is a discriminated payload keyed by the document's `kind`.
export interface RecordInstance<TData = unknown> {
  id: string;
  documentId: string;
  periodKey: string; // e.g. "2026-09-04" (daily) or "2026-09-04-F" (fortnightly due date) or "2026-Q3"
  dueDate: string; // ISO date the record is due
  status: RecordStatus;
  isDemo: boolean;
  responsibleUser?: string;
  data: TData;
  createdAt: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  // Set when the in-app assistant pre-filled this record's data (see
  // src/engine/autoFill.ts) so the user only has to review and confirm.
  // `notes` is the plain-language "what I filled in" summary shown on the
  // record and in the login briefing. Kept after submission for the audit
  // trail ("prepared by the assistant, reviewed and submitted by <user>").
  prepared?: PreparedInfo;
}

export interface PreparedInfo {
  at: string; // ISO timestamp
  by: "assistant";
  notes: string[];
  // Where the values came from, for transparency: the previous real record
  // it carried forward from (if any), otherwise the source-document specimen.
  basedOn: string;
}

// ---- 6. Generic log sheet (lamination QC / production formats) ------------
// One row = one line on the paper grid. Keys are the LogColumn.key values of
// the document's layout (see src/types/logSheet.ts); `id` is a stable row id.
export type LogSheetRow = { id: string } & Record<string, string | number | null>;

export interface LogSheetData {
  header: Record<string, string>; // keyed by LogHeaderField.key
  rows: LogSheetRow[];
}

// ---- 1. Daily Pest Control Monitoring Record (F/HR/17) -------------------
export interface DailyCheckpointAnswer {
  value: string | number | null; // "OK" | "NOT OK" | "Yes" | "No" | number | null
  note?: string; // free text, used for checkpoints 8 & 9 when a finding is flagged
}

export interface SummaryAction {
  id: string;
  dateOfObservation: string;
  descriptionOfObservation: string;
  actionTaken: string;
  remarks: string;
}

// Filled in whenever checkpoint 7 ("Any pest trapped in rodent trap box") is
// answered Yes: which numbered box, where it stands, how many rodents. This
// is what Reports > Rodent Trend adds up — the company's own Rodent Catch
// Report counts rodents, not days, so the record has to capture the count.
export interface RodentCatch {
  id: string;
  trapBoxNo: string; // e.g. "RB-27"
  location: string; // one of the Rodent Control Service areas (Master Data → Areas)
  count: number;
}

export interface DailyPestMonitoringData {
  isHoliday: boolean;
  checkpoints: Record<number, DailyCheckpointAnswer>; // key = checkpoint no. 1-10
  timeOfChecking: string;
  checker: string;
  summaryActions: SummaryAction[];
  rodentCatches?: RodentCatch[]; // optional: records saved before this field existed have none
}

// ---- 2. Fortnightly Fly Catcher Inspection & Cleaning Record (F/HR/18) ---
export interface FlyCatcherEntry {
  pcId: string;
  catchCountApprox: number | null;
  tubeLightInstallDate: string | null;
  tubeLightDueDate: string | null;
  cleaningDoneBy: string;
  verifiedBy: string;
}

export interface FlyCatcherData {
  monthYear: string; // e.g. "September-26" for display, matches source style
  entries: FlyCatcherEntry[];
}

// ---- 3. Pest Control Service Report (Rodent / General / Fly) -------------
export interface ServiceReportAreaLine {
  slNo: number;
  areaName: string;
  materialName: string;
  qtyUsed: string;
  methodOfApplication: string;
  remarks: string;
}

export interface ServiceReportData {
  serviceName: string;
  lines: ServiceReportAreaLine[];
  technicianSign: string;
  customerSign: string;
}

// ---- 4. CAPA (Corrective and Preventive Action) ---------------------------
// Internal type/field names kept as "Gap*" — this module was originally
// digitized from a "GAP Analysis Report" source document (see
// REQUIREMENTS.md) and is now presented to users as "CAPA"; renaming the
// internal identifiers has no user-facing benefit and touches validation
// logic keyed on the old names, so only the display layer changed.
export interface GapFinding {
  id: string;
  sNo: number;
  findingOfInspection: string;
  commentsOnFindings: string;
  correctiveActionContractor: string;
  correctiveActionClient: string;
  targetDate: string | null;
  actualDateOfAction: string | null;
  verifiedByServiceProvider: string;
  status: "Open" | "Overdue" | "Closed" | "Verified";
  source: "Internal" | "External"; // internal self-inspection finding, or from an external audit/customer/regulator
}

export interface GapInspectionData {
  inspectionDate: string;
  premisesName: string;
  premisesAddress: string;
  contactPerson: string;
  findings: GapFinding[];
  generalComments: string[];
}

// ---- 4b. CAPA — External: Customer Complaint Handling Checklist (F/MKT/05)
export type ChecklistSectionKey = "A" | "B" | "C" | "D" | "E";

export interface ChecklistItem {
  srNo: number; // printed Sr. No. (the source skips 6 — kept verbatim)
  activity: string; // verbatim activity text
  done: boolean;
  date: string | null; // ISO date the activity was completed
  comment: string;
  // "Not required" / "Not applicable" — the conditional "(If required)"
  // activities, or anything the complaint genuinely didn't need.
  notRequired: boolean;
}

export interface ChecklistSection {
  key: ChecklistSectionKey;
  title: string; // verbatim, e.g. "COMPLAINT RECEIPT & REGISTRATION"
  items: ChecklistItem[];
}

export interface ChecklistSignoff {
  name: string;
  designation: string;
  date: string | null;
}

export interface ComplaintChecklistData {
  customerName: string;
  complaintNo: string;
  jobName: string;
  jobCode: string;
  complaintReceivedDate: string | null;
  poNo: string;
  sections: ChecklistSection[];
  preparedBy: ChecklistSignoff;
  approvedBy: ChecklistSignoff; // stamped by the Verify (approval) step
}

// ---- 5. Training Record ----------------------------------------------------
export interface TrainingAttendee {
  id: string;
  employeeName: string;
  department: string;
  attended: boolean;
}

export interface TrainingRecordData {
  trainingDate: string;
  trainingType: string; // e.g. "Technician Certification"
  trainerProvider: string;
  topics: string[];
  attendees: TrainingAttendee[];
  certificateRef: string;
  remarks: string;
}
