import React from "react";
import { documentRepository } from "../data/repositories/documentRepository";
import { DocumentHeader } from "../components/documents/DocumentHeader";
import { SOP_SECTIONS } from "../data/seed/sopContent";

export function SopReferencePage() {
  const doc = documentRepository.getById("sop-reference")!;
  return (
    <div>
      <DocumentHeader doc={doc} dateLabel="Reference" />
      <p className="text-muted mt-3 mb-4">
        Reference configuration derived from the Standard Operating Procedure. Used to configure checkpoints, chemicals
        and frequencies across the Pest Control module — not rewritten beyond formatting for on-screen display.
      </p>
      {SOP_SECTIONS.map((s) => (
        <div key={s.title} className="card mb-4">
          <div className="card-header">
            <h3 className="text-base font-semibold">{s.title}</h3>
          </div>
          <div className="card-pad">
            <div className="mb-3">
              <div className="text-xs uppercase text-muted font-semibold mb-1">Chemicals to be Used</div>
              <p className="text-sm">{s.chemicals}</p>
            </div>
            <div className="mb-3">
              <div className="text-xs uppercase text-muted font-semibold mb-1">Process</div>
              <p className="text-sm">{s.process}</p>
            </div>
            <div className="mb-3">
              <div className="text-xs uppercase text-muted font-semibold mb-1">Pest Control Log Sheet</div>
              <p className="text-sm">{s.logSheet}</p>
            </div>
            <div className="mb-3">
              <div className="text-xs uppercase text-muted font-semibold mb-1">Preventive Measures</div>
              <p className="text-sm">{s.preventiveMeasures}</p>
            </div>
            <div>
              <div className="text-xs uppercase text-muted font-semibold mb-1">Frequency</div>
              <p className={`text-sm ${s.frequency.startsWith("TO BE CONFIRMED") ? "tbc" : ""}`}>{s.frequency}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
