import React from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import type { DocumentDefinition, RecordInstance, ServiceReportData } from "../../types";
import { DocumentHeader } from "../documents/DocumentHeader";
import { masterRepository } from "../../data/repositories/masterRepository";
import { COMPANY } from "../../data/seed/masterData";
import { fixedMaterialForServiceArea } from "../../engine/serviceMaterials";
import { formatDisplayDate } from "../../utils/date";

function matchingChemicalSuggestion(variantKey: string | undefined, serviceTypeChemicals: ReturnType<typeof masterRepository.get>["serviceTypeChemicals"]) {
  if (!variantKey) return undefined;
  const key = variantKey.toLowerCase();
  return serviceTypeChemicals.find((s) => key.includes(s.serviceName.split(" ")[0].toLowerCase()));
}

export function ServiceReportRecordView({
  doc,
  record,
  editable,
  onChange,
}: {
  doc: DocumentDefinition;
  record: RecordInstance<ServiceReportData>;
  editable: boolean;
  onChange: (data: ServiceReportData) => void;
}) {
  const data = record.data;
  const master = masterRepository.get();
  const suggestion = matchingChemicalSuggestion(doc.variantKey, master.serviceTypeChemicals);

  const updateLine = (slNo: number, patch: Partial<ServiceReportData["lines"][number]>) => {
    onChange({ ...data, lines: data.lines.map((l) => (l.slNo === slNo ? { ...l, ...patch } : l)) });
  };
  const addLine = () => {
    const nextNo = (data.lines.at(-1)?.slNo ?? 0) + 1;
    const fixed = fixedMaterialForServiceArea(doc.variantKey, "");
    onChange({
      ...data,
      lines: [
        ...data.lines,
        { slNo: nextNo, areaName: "", materialName: fixed.materialName, qtyUsed: "", methodOfApplication: fixed.methodOfApplication, remarks: "" },
      ],
    });
  };
  const removeLine = (slNo: number) => onChange({ ...data, lines: data.lines.filter((l) => l.slNo !== slNo) });

  return (
    <div>
      <div className="doc-header">
        <div className="company-name">Pest Control Service Report</div>
        <div className="meta-row">
          <div className="meta-cell" style={{ flex: 2 }}>
            <span className="k">Provider / Unit</span>
            <span className="v">
              {COMPANY.serviceProvider} — {COMPANY.name}
            </span>
            <div className="text-faint" style={{ fontSize: 10 }}>{COMPANY.address}</div>
          </div>
          <div className="meta-cell">
            <span className="k">Service Name</span>
            <span className="v">{data.serviceName}</span>
          </div>
          <div className="meta-cell">
            <span className="k">Date</span>
            <span className="v">{formatDisplayDate(record.dueDate)}</span>
          </div>
        </div>
      </div>

      {suggestion && (
        <div className="card mt-3" style={{ background: "var(--color-primary-light)", border: "1px solid var(--color-primary)" }}>
          <div className="card-pad text-sm">
            <strong>Chemical Master suggestion</strong> for {suggestion.serviceName}: Pest covered — {suggestion.pestCovered}.
            Chemicals — {suggestion.chemicals.join(", ")}. Dilution — {suggestion.dilutionRatio}.
          </div>
        </div>
      )}

      <div className="doc-table mt-4">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>Sl.No</th>
              <th>Area of Pesticide Applied</th>
              <th style={{ width: 170 }}>Material Name</th>
              <th style={{ width: 110 }}>Qty Used</th>
              <th style={{ width: 150 }}>Method of Application</th>
              <th>Remarks</th>
              {editable && <th></th>}
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l) => (
              <tr key={l.slNo}>
                <td>{l.slNo}</td>
                <td>
                  <input
                    className="input input-sm"
                    disabled={!editable}
                    value={l.areaName}
                    onChange={(e) => updateLine(l.slNo, { areaName: e.target.value })}
                  />
                </td>
                <td className="text-sm" title="Fixed — matches the SOP/Chemical Master for this service, not entered per visit">
                  {l.materialName || <span className="text-faint">—</span>}
                </td>
                <td>
                  <input
                    className="input input-sm"
                    disabled={!editable}
                    placeholder="Qty used"
                    value={l.qtyUsed}
                    onChange={(e) => updateLine(l.slNo, { qtyUsed: e.target.value })}
                  />
                </td>
                <td className="text-sm" title="Fixed — matches the SOP/Chemical Master for this service, not entered per visit">
                  {l.methodOfApplication || <span className="text-faint">—</span>}
                </td>
                <td>
                  <input
                    className="input input-sm"
                    disabled={!editable}
                    value={l.remarks}
                    onChange={(e) => updateLine(l.slNo, { remarks: e.target.value })}
                  />
                </td>
                {editable && (
                  <td>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeLine(l.slNo)}>
                      <FiTrash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <button className="btn btn-secondary btn-sm mt-2" onClick={addLine}>
          <FiPlus size={13} /> Add Area
        </button>
      )}

      <div className="card mt-4">
        <div className="card-pad flex gap-4 wrap">
          <div className="field" style={{ minWidth: 220 }}>
            <label>GPC Technician Sign</label>
            <input
              className="input"
              disabled={!editable}
              value={data.technicianSign}
              onChange={(e) => onChange({ ...data, technicianSign: e.target.value })}
              placeholder="Technician name"
            />
          </div>
          <div className="field" style={{ minWidth: 220 }}>
            <label>Customer's Representative Sign</label>
            <input
              className="input"
              disabled={!editable}
              value={data.customerSign}
              onChange={(e) => onChange({ ...data, customerSign: e.target.value })}
              placeholder="Customer representative name (required to verify)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
