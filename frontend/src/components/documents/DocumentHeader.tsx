import React from "react";
import type { DocumentDefinition } from "../../types";
import { COMPANY } from "../../data/seed/masterData";
import { formatDisplayDate } from "../../utils/date";

// Reproduces the original paper header block: company name, document title,
// Format No. / Rev No. / Date / Page No. row — used by every record view so
// the digital version is immediately recognizable as "the same document"
// (section 3).
export function DocumentHeader({
  doc,
  extraTitle,
  dateLabel,
  pageLabel,
  companyName,
  title,
}: {
  doc: DocumentDefinition;
  extraTitle?: string;
  dateLabel?: string;
  pageLabel?: string;
  /** The company name exactly as THIS form prints it (spellings differ between forms). */
  companyName?: string;
  /** The title exactly as the form prints it, when it differs from doc.name. */
  title?: string;
}) {
  return (
    <div className="doc-header">
      <div className="company-name">{companyName ?? COMPANY.name}</div>
      <div className="doc-title">
        {title ?? doc.name.toUpperCase()}
        {extraTitle ? ` — ${extraTitle}` : ""}
      </div>
      <div className="meta-row">
        <div className="meta-cell">
          <span className="k">Format No.</span>
          <span className="v">{doc.formatNo}</span>
        </div>
        <div className="meta-cell">
          <span className="k">Rev No.</span>
          <span className="v">{doc.revisionNo}</span>
        </div>
        <div className="meta-cell">
          <span className="k">Date</span>
          <span className="v">{dateLabel ?? formatDisplayDate(doc.revisionDate)}</span>
        </div>
        {pageLabel && (
          <div className="meta-cell">
            <span className="k">Page No.</span>
            <span className="v">{pageLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
