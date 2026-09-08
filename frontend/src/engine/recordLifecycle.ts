import type { DocumentDefinition, RecordInstance } from "../types";
import { recordRepository } from "../data/repositories/recordRepository";
import { validateForSubmit, validateForVerify, ValidationResult } from "./validation";

// Scheduled -> Due -> In Progress -> Submitted -> Pending Verification -> Verified
//                                        \-> Rejected -> (edit) -> Pending Verification
// See DATA_MODEL.md for the full state diagram. A record can never reach
// "Verified" without passing validateForVerify (section 16 requirement).

export function saveDraft<T>(record: RecordInstance<T>, newData: T): RecordInstance<T> {
  const nextStatus = record.status === "Due" || record.status === "Scheduled" ? "In Progress" : record.status;
  const updated: RecordInstance<T> = { ...record, data: newData, status: nextStatus };
  return recordRepository.upsert(updated as RecordInstance) as RecordInstance<T>;
}

export function submitRecord(
  doc: DocumentDefinition,
  record: RecordInstance,
  actorName: string
): { record: RecordInstance; result: ValidationResult } {
  const result = validateForSubmit(doc, record);
  if (!result.valid) return { record, result };
  const now = new Date().toISOString();
  const updated: RecordInstance = {
    ...record,
    status: "Pending Verification",
    submittedBy: actorName,
    submittedAt: now,
    rejectedBy: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
  };
  return { record: recordRepository.upsert(updated), result };
}

export function verifyRecord(
  doc: DocumentDefinition,
  record: RecordInstance,
  actorName: string
): { record: RecordInstance; result: ValidationResult } {
  const result = validateForVerify(doc, record);
  if (!result.valid) return { record, result };
  const now = new Date().toISOString();
  const updated: RecordInstance = {
    ...record,
    status: "Verified",
    verifiedBy: actorName,
    verifiedAt: now,
  };
  return { record: recordRepository.upsert(updated), result };
}

export function rejectRecord(record: RecordInstance, actorName: string, reason: string): RecordInstance {
  const now = new Date().toISOString();
  const updated: RecordInstance = {
    ...record,
    status: "Rejected",
    rejectedBy: actorName,
    rejectedAt: now,
    rejectionReason: reason,
  };
  return recordRepository.upsert(updated);
}

export function resumeAfterRejection(record: RecordInstance): RecordInstance {
  const updated: RecordInstance = { ...record, status: "In Progress" };
  return recordRepository.upsert(updated);
}

export function isOverdue(record: RecordInstance, todayISO: string): boolean {
  return (
    record.dueDate < todayISO &&
    ["Scheduled", "Due", "In Progress"].includes(record.status)
  );
}
