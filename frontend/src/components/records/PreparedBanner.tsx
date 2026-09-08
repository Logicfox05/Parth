import React from "react";
import { FiRefreshCw, FiZap } from "react-icons/fi";
import type { PreparedInfo, RecordStatus } from "../../types";

// Shown at the top of any record the assistant pre-filled. Says exactly what
// was filled in and where the values came from, so "review and confirm" is a
// real review and not a rubber stamp.
export function PreparedBanner({
  prepared,
  status,
  onReprepare,
}: {
  prepared: PreparedInfo;
  status: RecordStatus;
  onReprepare?: () => void;
}) {
  const draft = ["Scheduled", "Due", "In Progress", "Rejected"].includes(status);
  const when = new Date(prepared.at);
  return (
    <div className="prepared-banner mb-4">
      <div className="flex items-start justify-between gap-3 wrap">
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="font-semibold text-sm flex items-center gap-2">
            <FiZap size={14} /> {draft ? "Your assistant has filled this in for you" : "Filled in by your assistant, then reviewed and submitted"}
          </div>
          <div className="text-xs text-muted mt-1">
            Prepared {when.toLocaleString()} · based on {prepared.basedOn}
          </div>
          <ul className="text-sm mt-2" style={{ margin: "8px 0 0 18px", padding: 0 }}>
            {prepared.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {draft && (
            <div className="text-xs mt-2 text-muted">
              Have a look, change anything that was different today, then press <strong>Submit</strong>. Nothing is recorded as yours until you do.
            </div>
          )}
        </div>
        {draft && onReprepare && (
          <button className="btn btn-secondary btn-sm no-print" onClick={onReprepare} title="Discard your edits and let the assistant fill it in again">
            <FiRefreshCw size={12} /> Fill again
          </button>
        )}
      </div>
    </div>
  );
}
