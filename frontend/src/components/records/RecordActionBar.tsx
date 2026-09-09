import React, { useState } from "react";
import { FiSave, FiSend, FiCheckCircle, FiXCircle, FiPrinter, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import type { RecordStatus } from "../../types";
import { Modal } from "../common/Modal";
import { useT } from "../../i18n";

export function RecordActionBar({
  status,
  dirty,
  isDemo,
  onSave,
  onSubmit,
  onVerify,
  onReject,
  onResume,
  onPrint,
  onDelete,
}: {
  status: RecordStatus;
  dirty: boolean;
  isDemo: boolean;
  onSave: () => void;
  onSubmit: () => void;
  onVerify: () => void;
  onReject: (reason: string) => void;
  onResume: () => void;
  onPrint: () => void;
  // Optional: omit to hide Delete entirely (e.g. while the record's own
  // page hasn't wired a destination to navigate back to after deleting).
  onDelete?: () => void;
}) {
  const t = useT();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const editableStatuses: RecordStatus[] = ["Scheduled", "Due", "In Progress"];
  const verifiableStatuses: RecordStatus[] = ["Submitted", "Pending Verification"];
  // Deletable while it's still a draft — once Submitted/Pending
  // Verification/Verified it's part of the audit trail and shouldn't be
  // removable from the UI, same as Rejected records (still not finalized,
  // someone may just want to discard a mistake rather than resume it).
  const deletableStatuses: RecordStatus[] = ["Scheduled", "Due", "In Progress", "Rejected"];

  return (
    <div className="flex items-center justify-end gap-2 wrap no-print" style={{ marginTop: 16 }}>
      {onDelete && deletableStatuses.includes(status) && (
        <button className="btn btn-danger btn-sm" onClick={() => setConfirmingDelete(true)} style={{ marginRight: "auto" }}>
          <FiTrash2 size={13} /> {t("common.delete")}
        </button>
      )}
      <button className="btn btn-secondary btn-sm" onClick={onPrint}>
        <FiPrinter size={13} /> {t("common.printRecord")}
      </button>

      {editableStatuses.includes(status) && (
        <>
          <button className="btn btn-secondary" onClick={onSave} disabled={!dirty}>
            <FiSave size={14} /> {t("common.save")}
          </button>
          <button className="btn btn-primary" onClick={onSubmit}>
            <FiSend size={14} /> {t("common.submit")}
          </button>
        </>
      )}

      {status === "Rejected" && (
        <button className="btn btn-primary" onClick={onResume}>
          <FiRotateCcw size={14} /> {t("common.resumeEditing")}
        </button>
      )}

      {verifiableStatuses.includes(status) && (
        <>
          <button className="btn btn-danger" onClick={() => setRejecting(true)}>
            <FiXCircle size={14} /> {t("common.reject")}
          </button>
          <button className="btn btn-success" onClick={onVerify}>
            <FiCheckCircle size={14} /> {t("common.verify")}
            {isDemo ? ` (${t("common.demo")})` : ""}
          </button>
        </>
      )}

      {rejecting && (
        <Modal
          title="Reject record"
          onClose={() => setRejecting(false)}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button className="btn btn-secondary" onClick={() => setRejecting(false)}>
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onReject(reason);
                  setRejecting(false);
                  setReason("");
                }}
                disabled={!reason.trim()}
              >
                {t("common.reject")}
              </button>
            </div>
          }
        >
          <div className="field">
            <label>Reason for rejection</label>
            <textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </Modal>
      )}

      {confirmingDelete && onDelete && (
        <Modal
          title="Delete this record?"
          onClose={() => setConfirmingDelete(false)}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button className="btn btn-secondary" onClick={() => setConfirmingDelete(false)}>
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setConfirmingDelete(false);
                  onDelete();
                }}
              >
                <FiTrash2 size={13} /> {t("common.deletePermanently")}
              </button>
            </div>
          }
        >
          <p className="text-sm">This permanently removes this draft record — there's no undo. Only do this for a record created by mistake.</p>
        </Modal>
      )}
    </div>
  );
}
