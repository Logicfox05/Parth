import React from "react";
import { FiX } from "react-icons/fi";

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 560,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="text-lg">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
        <div className="card-pad">{children}</div>
        {footer && (
          <div className="card-header" style={{ borderTop: "1px solid var(--color-border)", borderBottom: "none" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
