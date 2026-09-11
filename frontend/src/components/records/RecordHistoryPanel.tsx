import React, { useEffect, useRef } from "react";
import { FiAlertTriangle, FiClock, FiEdit3 } from "react-icons/fi";
import type { CorrectionInfo, HistoryAction, RecordInstance } from "../../types";
import { historyIsDerived, historyOf } from "../../engine/recordHistory";
import { useT } from "../../i18n";

// What an auditor asks to see first: every change to this record, who made
// it, when, and what it said before. Newest first. Collapsed by default so it
// never gets in the way of filling the form in.

const ACTION_KEY: Record<HistoryAction, string> = {
  prepared: "history.prepared",
  edited: "history.edited",
  "assistant-edit": "history.assistantEdit",
  submitted: "history.submitted",
  verified: "history.verified",
  rejected: "history.rejected",
  resumed: "history.resumed",
  reopened: "history.reopened",
};

const TONE: Partial<Record<HistoryAction, string>> = {
  verified: "ok",
  rejected: "bad",
  reopened: "warn",
  "assistant-edit": "ai",
};

export function RecordHistoryPanel({ record }: { record: RecordInstance }) {
  const t = useT();
  const entries = historyOf(record).slice().reverse();
  const derived = historyIsDerived(record);
  return (
    <details className="card mt-4 record-history no-print" data-section="record-history">
      <summary className="record-history-summary">
        <span className="text-base font-semibold">
          <FiClock size={14} style={{ verticalAlign: -2 }} /> {t("record.history")} ({entries.length})
        </span>
        <span className="text-xs text-muted">{t("record.historyHint")}</span>
      </summary>
      <div className="card-pad">
        {derived && entries.length > 0 && <p className="text-xs text-muted mb-2">{t("record.historyDerived")}</p>}
        {entries.length === 0 && <p className="text-sm text-muted">{t("record.historyEmpty")}</p>}
        <ol className="history-list">
          {entries.map((e) => (
            <li key={e.id} className={`history-entry ${TONE[e.action] ?? ""}`} data-history-action={e.action}>
              <div className="history-head">
                <strong>{t(ACTION_KEY[e.action])}</strong>
                <span className="text-muted">
                  {" "}
                  — {e.by} · {new Date(e.at).toLocaleString()}
                </span>
              </div>
              {e.note && <div className="text-sm history-note">{e.note}</div>}
              {e.changes && e.changes.length > 0 && (
                <div className="doc-table history-changes-wrap">
                  <table className="compact history-changes">
                    <thead>
                      <tr>
                        <th>{t("record.field")}</th>
                        <th>{t("record.before")}</th>
                        <th>{t("record.after")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.changes.map((c) => (
                        <tr key={c.field}>
                          <td>{c.label}</td>
                          <td className="before">{c.before || t("record.blank")}</td>
                          <td className="after">{c.after || t("record.blank")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {e.moreChanges ? <div className="text-xs text-muted">{t("record.moreChanges", { n: e.moreChanges })}</div> : null}
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}

/** Shown while a record that had been submitted or verified is reopened to correct it. */
export function CorrectionBanner({ correction }: { correction: CorrectionInfo }) {
  const t = useT();
  return (
    <div className="card mb-4 correction-banner no-print" data-section="correction-banner" role="status">
      <div className="card-pad text-sm">
        <strong>
          <FiEdit3 size={13} style={{ verticalAlign: -1 }} /> {t("record.beingCorrected")}
        </strong>{" "}
        — {t("record.correctionBy", { by: correction.by, when: new Date(correction.at).toLocaleString(), status: correction.fromStatus })}
        <div className="mt-1">
          <strong>{t("record.reason")}:</strong> {correction.reason}
        </div>
        <div className="text-xs text-muted mt-1">{t("record.correctionNext")}</div>
      </div>
    </div>
  );
}

/** The list of what's stopping a submit/verify — scrolled into view, so it's never missed. */
export function ErrorList({ errors, heading }: { errors: string[]; heading: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errors.length > 0) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errors]);
  if (errors.length === 0) return null;
  return (
    <div ref={ref} className="card mb-4 no-print error-list" role="alert" style={{ borderColor: "var(--color-danger)", background: "var(--color-danger-bg)" }}>
      <div className="card-pad">
        <strong className="text-danger">
          <FiAlertTriangle size={14} style={{ verticalAlign: -2 }} /> {heading}
        </strong>
        <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
          {errors.map((e, i) => (
            <li key={i} className="text-danger text-sm">
              {e}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
