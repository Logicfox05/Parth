import React from "react";
import type { RecordStatus } from "../../types";
import { useT } from "../../i18n";

const CLASS_MAP: Record<RecordStatus, string> = {
  Scheduled: "badge-Scheduled",
  Due: "badge-Due",
  "In Progress": "badge-InProgress",
  Submitted: "badge-Submitted",
  "Pending Verification": "badge-PendingVerification",
  Verified: "badge-Verified",
  Rejected: "badge-Rejected",
};

export function StatusBadge({ status, overdue }: { status: RecordStatus; overdue?: boolean }) {
  const t = useT();
  if (overdue) {
    return (
      <span className="badge badge-Overdue">
        <span className="dot" /> {t("status.Overdue")}
      </span>
    );
  }
  return (
    <span className={`badge ${CLASS_MAP[status]}`}>
      <span className="dot" /> {t(`status.${status}`)}
    </span>
  );
}
