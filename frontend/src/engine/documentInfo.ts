import type { DocumentDefinition, Employee, MasterData } from "../types";
import { scheduleLabel } from "./frequencyEngine";

// Single source of truth for "who's responsible for this document" — used
// by Document Library, the reminder engine, and the assistant, so all three
// always agree. Matches DocumentDefinition.id against a per-document role
// keyword (Master Data → Documents) case-insensitively against Employee.role.
export function resolveResponsibleEmployees(doc: DocumentDefinition, master: MasterData): Employee[] {
  const keyword = (master.documentRoleKeywords ?? {})[doc.id]?.trim();
  if (!keyword) return [];
  const needle = keyword.toLowerCase();
  return master.employees.filter((e) => e.active && e.role.toLowerCase().includes(needle));
}

export interface DocumentInfo {
  what: string;
  how: string;
  who: Employee[];
  whoLabel: string;
  when: string;
}

// The FMS-style "WHAT / HOW / WHO / WHEN" summary for one document —
// entirely derived from data that already exists (DocumentDefinition +
// Master Data), nothing invented. Shared by the Document Library detail
// view and the assistant's "about this document" card.
export function getDocumentInfo(doc: DocumentDefinition, master: MasterData): DocumentInfo {
  const who = doc.isReferenceOnly ? [] : resolveResponsibleEmployees(doc, master);
  const revision = doc.revisionNo && doc.revisionNo !== "TO BE CONFIRMED" ? ` (Rev ${doc.revisionNo})` : "";
  return {
    what: doc.description,
    how: `Format ${doc.formatNo}${revision} — filled digitally in the app${
      doc.isReferenceOnly ? "." : ", then Submitted and Verified through the approval workflow."
    }`,
    who,
    whoLabel: doc.isReferenceOnly
      ? "Reference document — no single owner"
      : who.length > 0
        ? who.map((e) => e.name).join(", ")
        : "Unassigned — set a role in Master Data → Documents",
    when: doc.isReferenceOnly ? "As needed — reference only, no due dates" : `${doc.frequency} — ${scheduleLabel(doc)}`,
  };
}
