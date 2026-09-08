import React, { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useRouter } from "../store/router";
import { useAppStore } from "../store/AppStore";
import { recordRepository } from "../data/repositories/recordRepository";
import { documentRepository } from "../data/repositories/documentRepository";
import { saveDraft, submitRecord, verifyRecord, rejectRecord, resumeAfterRejection } from "../engine/recordLifecycle";
import { reprepareRecord } from "../engine/assistantPrepare";
import { getLogSheetLayout } from "../data/seed/logSheetLayouts";
import type { DailyPestMonitoringData, FlyCatcherData, LogSheetData, RecordInstance, ServiceReportData } from "../types";
import { DailyPestMonitoringRecordView } from "../components/records/DailyPestMonitoringRecordView";
import { FlyCatcherRecordView } from "../components/records/FlyCatcherRecordView";
import { ServiceReportRecordView } from "../components/records/ServiceReportRecordView";
import { LogSheetRecordView } from "../components/records/LogSheetRecordView";
import { PreparedBanner } from "../components/records/PreparedBanner";
import { RecordActionBar } from "../components/records/RecordActionBar";
import { StatusBadge } from "../components/common/StatusBadge";
import { DemoTag } from "../components/common/DemoTag";
import { useSetAssistantTarget } from "../store/AssistantContext";
import { todayISO } from "../utils/date";

export function RecordPage({ recordId }: { recordId?: string }) {
  const { navigate } = useRouter();
  const { currentUser, bump } = useAppStore();
  const [record, setRecord] = useState<RecordInstance | undefined>(() => (recordId ? recordRepository.getById(recordId) : undefined));
  const [data, setData] = useState<unknown>(record?.data);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const r = recordId ? recordRepository.getById(recordId) : undefined;
    setRecord(r);
    setData(r?.data);
    setDirty(false);
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const doc = record ? documentRepository.getById(record.documentId) : undefined;
  const editable = !!record && ["Scheduled", "Due", "In Progress"].includes(record.status);

  const handleChange = (next: unknown) => {
    setData(next);
    setDirty(true);
  };

  // For log sheets the AI assistant needs to know the column names to map
  // "11 o'clock viscosity was 20.4" onto the right cell — send the layout
  // alongside the data (never persisted; stripped from any returned patch).
  const assistantData = (() => {
    if (!doc || doc.kind !== "log-sheet") return data;
    const layout = getLogSheetLayout(doc.id);
    return {
      ...(data as Record<string, unknown>),
      _layout: layout
        ? {
            headerFields: layout.headerFields.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options })),
            columns: layout.columns.map((c) => ({ key: c.key, label: c.label, type: c.type, unit: c.unit, fixed: c.fixed })),
            rowMode: layout.rowMode.kind,
          }
        : undefined,
    };
  })();

  useSetAssistantTarget(
    doc && editable
      ? {
          documentKind: doc.kind,
          documentId: doc.id,
          currentData: assistantData,
          onApply: (patch) => {
            const { _layout, ...rest } = patch as Record<string, unknown> & { _layout?: unknown };
            void _layout;
            handleChange({ ...(data as Record<string, unknown>), ...rest });
          },
        }
      : null
  );

  if (!record) {
    return (
      <div className="empty-state">
        <h2 className="text-xl mb-2">Record not found</h2>
        <button className="btn btn-secondary" onClick={() => navigate("/calendar")}>
          <FiArrowLeft size={13} /> Back to Calendar
        </button>
      </div>
    );
  }

  if (!doc) return <div className="empty-state">Document definition missing for this record.</div>;

  const persistLocal = (updated: RecordInstance) => {
    setRecord(updated);
    setData(updated.data);
    setDirty(false);
    bump();
  };

  const handleSave = () => {
    const updated = saveDraft(record, data);
    persistLocal(updated);
  };

  const handleSubmit = () => {
    const withData = { ...record, data };
    recordRepository.upsert(withData);
    const { record: updated, result } = submitRecord(doc, withData, currentUser);
    if (!result.valid) {
      setErrors(result.errors);
      setRecord(withData);
      return;
    }
    setErrors([]);
    persistLocal(updated);
  };

  const handleVerify = () => {
    const { record: updated, result } = verifyRecord(doc, record, currentUser);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    persistLocal(updated);
  };

  const handleReject = (reason: string) => {
    const updated = rejectRecord(record, currentUser, reason);
    persistLocal(updated);
  };

  const handleResume = () => {
    const updated = resumeAfterRejection(record);
    persistLocal(updated);
  };

  const handleDelete = () => {
    recordRepository.remove(record.id);
    bump();
    navigate("/calendar");
  };

  const handleReprepare = () => {
    const updated = reprepareRecord(record.id);
    if (updated) persistLocal(updated);
  };

  const overdue = record.dueDate < todayISO() && ["Scheduled", "Due", "In Progress"].includes(record.status);

  return (
    <div className={record.isDemo ? "demo-watermark" : ""}>
      <div className="flex items-center justify-between mb-3 no-print">
        <button className="btn btn-ghost btn-sm" onClick={() => window.history.back()}>
          <FiArrowLeft size={13} /> Back
        </button>
        <div className="flex items-center gap-2">
          {record.isDemo && <DemoTag />}
          <StatusBadge status={record.status} overdue={overdue} />
        </div>
      </div>

      {record.prepared && <PreparedBanner prepared={record.prepared} status={record.status} onReprepare={editable ? handleReprepare : undefined} />}

      {record.status === "Rejected" && record.rejectionReason && (
        <div className="card mb-4" style={{ borderColor: "var(--color-danger)", background: "var(--color-danger-bg)" }}>
          <div className="card-pad text-sm">
            <strong>Rejected</strong> by {record.rejectedBy} — {record.rejectionReason}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="card mb-4 no-print" style={{ borderColor: "var(--color-danger)", background: "var(--color-danger-bg)" }}>
          <div className="card-pad">
            <strong className="text-danger">Please fix the following before submitting:</strong>
            <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
              {errors.map((e, i) => (
                <li key={i} className="text-danger text-sm">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {doc.kind === "daily-pest-monitoring" && (
        <DailyPestMonitoringRecordView
          doc={doc}
          record={{ ...record, data: data as DailyPestMonitoringData }}
          editable={editable}
          onChange={handleChange}
        />
      )}
      {doc.kind === "fly-catcher" && (
        <FlyCatcherRecordView doc={doc} record={{ ...record, data: data as FlyCatcherData }} editable={editable} onChange={handleChange} />
      )}
      {doc.kind === "service-report" && (
        <ServiceReportRecordView doc={doc} record={{ ...record, data: data as ServiceReportData }} editable={editable} onChange={handleChange} />
      )}
      {doc.kind === "log-sheet" && (
        <LogSheetRecordView doc={doc} record={{ ...record, data: data as LogSheetData }} editable={editable} onChange={handleChange} />
      )}
      {doc.kind === "training-record" && (
        <div className="empty-state">
          Training records open in the Training module.{" "}
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/training/${record.id}`)}>
            Open there
          </button>
        </div>
      )}

      <div className="card mt-4 no-print">
        <div className="card-pad flex gap-6 wrap text-xs text-muted">
          <div>Created: {new Date(record.createdAt).toLocaleString()}</div>
          {record.prepared && <div>Prepared by assistant: {new Date(record.prepared.at).toLocaleString()}</div>}
          {record.submittedAt && <div>Submitted: {new Date(record.submittedAt).toLocaleString()} by {record.submittedBy}</div>}
          {record.verifiedAt && <div>Verified: {new Date(record.verifiedAt).toLocaleString()} by {record.verifiedBy}</div>}
        </div>
      </div>

      <RecordActionBar
        status={record.status}
        dirty={dirty}
        isDemo={record.isDemo}
        onSave={handleSave}
        onSubmit={handleSubmit}
        onVerify={handleVerify}
        onReject={handleReject}
        onResume={handleResume}
        onPrint={() => window.print()}
        onDelete={handleDelete}
      />
    </div>
  );
}
