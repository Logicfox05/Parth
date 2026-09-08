import React, { useState } from "react";
import { FiPlus, FiTrash2, FiArrowLeft } from "react-icons/fi";
import { useAppStore } from "../store/AppStore";
import { useRouter } from "../store/router";
import { recordRepository } from "../data/repositories/recordRepository";
import { documentRepository } from "../data/repositories/documentRepository";
import { refreshGapFindingStatuses } from "../data/selectors";
import type { GapFinding, GapInspectionData, RecordInstance } from "../types";
import { saveDraft, submitRecord, verifyRecord, rejectRecord, resumeAfterRejection } from "../engine/recordLifecycle";
import { RecordActionBar } from "../components/records/RecordActionBar";
import { StatusBadge } from "../components/common/StatusBadge";
import { DemoTag } from "../components/common/DemoTag";
import { useSetAssistantTarget } from "../store/AssistantContext";
import { generateId } from "../utils/id";
import { formatDisplayDate, todayISO } from "../utils/date";
import { COMPANY } from "../data/seed/masterData";

const GAP_DOC_ID = "gap-inspection";

export function GapListPage() {
  const { mode, bump } = useAppStore();
  const { navigate } = useRouter();
  const isDemo = mode === "demo";
  refreshGapFindingStatuses(isDemo);
  const records = recordRepository.query({ documentId: GAP_DOC_ID, isDemo }) as RecordInstance<GapInspectionData>[];
  const doc = documentRepository.getById(GAP_DOC_ID)!;

  const createNew = () => {
    const now = new Date().toISOString();
    const rec: RecordInstance<GapInspectionData> = {
      id: generateId("gap"),
      documentId: GAP_DOC_ID,
      periodKey: generateId("period"),
      dueDate: todayISO(),
      status: "In Progress",
      isDemo,
      data: {
        inspectionDate: todayISO(),
        premisesName: COMPANY.name,
        premisesAddress: COMPANY.address,
        contactPerson: "",
        findings: [],
        generalComments: [],
      },
      createdAt: now,
      updatedAt: now,
    };
    recordRepository.upsert(rec as RecordInstance);
    bump();
    navigate(`/gap/${rec.id}`);
  };

  return (
    <div>
      <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate("/gap")}>
        <FiArrowLeft size={13} /> CAPA
      </button>
      <div className="flex items-center justify-between mb-4 gap-3 wrap">
        <div>
          <h1 className="text-2xl mb-1">Internal — Inspection Findings</h1>
          <p className="text-muted">{doc.description}</p>
        </div>
        <button className="btn btn-primary" onClick={createNew}>
          <FiPlus size={14} /> New Internal CAPA Record
        </button>
      </div>

      <div className="doc-table">
        <table>
          <thead>
            <tr>
              <th>Inspection Date</th>
              <th>Premises</th>
              <th>Findings</th>
              <th>Open / Overdue</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted text-center" style={{ padding: 24 }}>
                  No CAPA records recorded yet.
                </td>
              </tr>
            )}
            {records
              .slice()
              .sort((a, b) => (a.data.inspectionDate < b.data.inspectionDate ? 1 : -1))
              .map((r) => {
                const open = r.data.findings.filter((f) => f.status === "Open" || f.status === "Overdue").length;
                return (
                  <tr key={r.id} className="card-clickable" onClick={() => navigate(`/gap/${r.id}`)}>
                    <td>{formatDisplayDate(r.data.inspectionDate)}</td>
                    <td>
                      {r.data.premisesName} {r.isDemo && <DemoTag />}
                    </td>
                    <td>{r.data.findings.length}</td>
                    <td>{open > 0 ? <span className="badge badge-Overdue">{open} open</span> : <span className="badge badge-Verified">0</span>}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-ghost btn-sm">Open</button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GapRecordPage({ recordId }: { recordId: string }) {
  const { currentUser, bump } = useAppStore();
  const { navigate } = useRouter();
  const [record, setRecord] = useState<RecordInstance<GapInspectionData> | undefined>(
    () => recordRepository.getById(recordId) as RecordInstance<GapInspectionData> | undefined
  );
  const [errors, setErrors] = useState<string[]>([]);
  const doc = documentRepository.getById(GAP_DOC_ID)!;

  const editable = !!record && ["Scheduled", "Due", "In Progress"].includes(record.status);
  // Closing a finding is a follow-up to a report that has already been
  // filed, so it stays possible while the report awaits verification —
  // otherwise the only way to clear a long-done action would be to reject
  // the whole report and resubmit it.
  const canClose = editable || (!!record && ["Submitted", "Pending Verification"].includes(record.status));

  const applyPatch = (patch: Partial<GapInspectionData>) => {
    if (!record) return;
    const updated = { ...record, data: { ...record.data, ...patch } };
    setRecord(updated);
    recordRepository.upsert(updated as RecordInstance);
    bump();
  };

  useSetAssistantTarget(
    record && editable
      ? { documentKind: "gap", documentId: doc.id, currentData: record.data, onApply: (patch) => applyPatch(patch as Partial<GapInspectionData>) }
      : null
  );

  if (!record) {
    return (
      <div className="empty-state">
        <h2 className="text-xl mb-2">CAPA record not found</h2>
        <button className="btn btn-secondary" onClick={() => navigate("/gap/internal")}>
          <FiArrowLeft size={13} /> Back
        </button>
      </div>
    );
  }

  const data = record.data;
  const update = applyPatch;

  const updateFinding = (id: string, patch: Partial<GapFinding>) => {
    update({ findings: data.findings.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  };
  const addFinding = () => {
    const sNo = (data.findings.at(-1)?.sNo ?? 0) + 1;
    update({
      findings: [
        ...data.findings,
        {
          id: generateId("finding"),
          sNo,
          findingOfInspection: "",
          commentsOnFindings: "",
          correctiveActionContractor: "",
          correctiveActionClient: "",
          targetDate: null,
          actualDateOfAction: null,
          verifiedByServiceProvider: "",
          status: "Open",
          source: "Internal",
        },
      ],
    });
  };
  const removeFinding = (id: string) => update({ findings: data.findings.filter((f) => f.id !== id) });

  const closeFinding = (id: string) => {
    updateFinding(id, { status: "Closed", actualDateOfAction: todayISO() });
  };
  const openFindings = data.findings.filter((f) => f.status === "Open" || f.status === "Overdue");
  const closeAll = () => {
    update({ findings: data.findings.map((f) => (f.status === "Open" || f.status === "Overdue" ? { ...f, status: "Closed", actualDateOfAction: f.actualDateOfAction ?? todayISO() } : f)) });
  };

  const handleSave = () => {
    const updated = saveDraft(record, data);
    setRecord(updated);
    bump();
  };
  const handleSubmit = () => {
    const { record: updated, result } = submitRecord(doc, record, currentUser);
    if (!result.valid) return setErrors(result.errors);
    setErrors([]);
    setRecord(updated as RecordInstance<GapInspectionData>);
    bump();
  };
  const handleVerify = () => {
    const { record: updated, result } = verifyRecord(doc, record, currentUser);
    if (!result.valid) return setErrors(result.errors);
    setErrors([]);
    setRecord(updated as RecordInstance<GapInspectionData>);
    bump();
  };
  const handleReject = (reason: string) => {
    setRecord(rejectRecord(record, currentUser, reason) as RecordInstance<GapInspectionData>);
    bump();
  };
  const handleResume = () => {
    setRecord(resumeAfterRejection(record) as RecordInstance<GapInspectionData>);
    bump();
  };
  const handleDelete = () => {
    recordRepository.remove(record.id);
    bump();
    navigate("/gap/internal");
  };

  return (
    <div className={record.isDemo ? "demo-watermark" : ""}>
      <div className="flex items-center justify-between mb-3 no-print">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/gap/internal")}>
          <FiArrowLeft size={13} /> Back to internal findings
        </button>
        <div className="flex items-center gap-2">
          {record.isDemo && <DemoTag />}
          <StatusBadge status={record.status} />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="card mb-4 no-print" style={{ borderColor: "var(--color-danger)", background: "var(--color-danger-bg)" }}>
          <div className="card-pad">
            <strong className="text-danger">Please fix the following:</strong>
            <ul style={{ margin: "8px 0 0 18px" }}>
              {errors.map((e, i) => (
                <li key={i} className="text-danger text-sm">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="doc-header">
        <div className="company-name">CAPA — Internal: Pest Control Inspection Findings Report</div>
        <div className="meta-row">
          <div className="meta-cell">
            <span className="k">Date of Inspection</span>
            <input
              type="date"
              className="input input-sm"
              disabled={!editable}
              value={data.inspectionDate}
              onChange={(e) => update({ inspectionDate: e.target.value })}
            />
          </div>
          <div className="meta-cell" style={{ flex: 2 }}>
            <span className="k">Name &amp; Address of Premises Inspected</span>
            <input
              className="input input-sm"
              disabled={!editable}
              value={data.premisesName}
              onChange={(e) => update({ premisesName: e.target.value })}
            />
          </div>
          <div className="meta-cell">
            <span className="k">Contact Person</span>
            <input
              className="input input-sm"
              disabled={!editable}
              value={data.contactPerson}
              onChange={(e) => update({ contactPerson: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="doc-table mt-4">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>S.No</th>
              <th>Finding</th>
              <th>Comments</th>
              <th>Corrective Action (Client)</th>
              <th style={{ width: 120 }}>Target Date</th>
              <th style={{ width: 120 }}>Actual Date</th>
              <th style={{ width: 100 }}>Status</th>
              {editable && <th></th>}
            </tr>
          </thead>
          <tbody>
            {data.findings.map((f) => (
              <tr key={f.id}>
                <td>{f.sNo}</td>
                <td>
                  <input className="input input-sm" disabled={!editable} value={f.findingOfInspection} onChange={(e) => updateFinding(f.id, { findingOfInspection: e.target.value })} />
                </td>
                <td>
                  <input className="input input-sm" disabled={!editable} value={f.commentsOnFindings} onChange={(e) => updateFinding(f.id, { commentsOnFindings: e.target.value })} />
                </td>
                <td>
                  <input className="input input-sm" disabled={!editable} value={f.correctiveActionClient} onChange={(e) => updateFinding(f.id, { correctiveActionClient: e.target.value })} />
                </td>
                <td>
                  <input
                    type="date"
                    className="input input-sm"
                    disabled={!editable}
                    value={f.targetDate ?? ""}
                    onChange={(e) => updateFinding(f.id, { targetDate: e.target.value || null })}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    className="input input-sm"
                    disabled={!editable}
                    value={f.actualDateOfAction ?? ""}
                    onChange={(e) => updateFinding(f.id, { actualDateOfAction: e.target.value || null })}
                  />
                </td>
                <td>
                  <span className={`badge badge-${f.status === "Overdue" ? "Overdue" : f.status === "Open" ? "Due" : "Verified"}`}>{f.status}</span>
                  {(f.status === "Open" || f.status === "Overdue") && canClose && (
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }} onClick={() => closeFinding(f.id)}>
                      Close
                    </button>
                  )}
                </td>
                {editable && (
                  <td>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeFinding(f.id)}>
                      <FiTrash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {data.findings.length === 0 && (
              <tr>
                <td colSpan={8} className="text-muted text-center" style={{ padding: 16 }}>
                  No findings added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(editable || (canClose && openFindings.length > 0)) && (
        <div className="flex gap-2 mt-2 wrap">
          {editable && (
            <button className="btn btn-secondary btn-sm" onClick={addFinding}>
              <FiPlus size={13} /> Add Finding
            </button>
          )}
          {canClose && openFindings.length > 0 && (
            <button className="btn btn-success btn-sm" onClick={closeAll} title="Stamp today's date as the actual date of action on every open finding">
              Close all {openFindings.length} open finding{openFindings.length === 1 ? "" : "s"} (action done today)
            </button>
          )}
        </div>
      )}

      <div className="card mt-4">
        <div className="card-header">
          <h3 className="text-base font-semibold">General Comments</h3>
          {editable && (
            <button className="btn btn-secondary btn-sm" onClick={() => update({ generalComments: [...data.generalComments, ""] })}>
              <FiPlus size={13} /> Add
            </button>
          )}
        </div>
        <div className="card-pad">
          {data.generalComments.map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                className="input"
                disabled={!editable}
                value={c}
                onChange={(e) =>
                  update({ generalComments: data.generalComments.map((x, xi) => (xi === i ? e.target.value : x)) })
                }
              />
              {editable && (
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => update({ generalComments: data.generalComments.filter((_, xi) => xi !== i) })}
                >
                  <FiTrash2 size={13} />
                </button>
              )}
            </div>
          ))}
          {data.generalComments.length === 0 && <p className="text-muted text-sm">No general comments.</p>}
        </div>
      </div>

      <RecordActionBar
        status={record.status}
        dirty={false}
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
