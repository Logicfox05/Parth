import React, { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useAppStore } from "../store/AppStore";
import { masterRepository } from "../data/repositories/masterRepository";
import { documentRepository } from "../data/repositories/documentRepository";
import { settingsRepository } from "../data/repositories/settingsRepository";
import { generateId } from "../utils/id";
import { todayISO } from "../utils/date";
import { scheduleLabel } from "../engine/frequencyEngine";
import { resolveResponsibleEmployees } from "../engine/documentInfo";
import type { CompanyHoliday, Employee } from "../types";

type Tab = "employees" | "chemicals" | "pcLocations" | "rodentStations" | "areas" | "checkpoints" | "documents" | "holidays" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "employees", label: "Employees" },
  { key: "chemicals", label: "Chemicals" },
  { key: "pcLocations", label: "PC IDs (Fly Catchers)" },
  { key: "rodentStations", label: "Rodent Stations" },
  { key: "areas", label: "Areas" },
  { key: "checkpoints", label: "Checkpoints" },
  { key: "documents", label: "Documents / Formats" },
  { key: "holidays", label: "Holidays" },
  { key: "settings", label: "Working Hours & Briefing" },
];

export function MasterDataPage() {
  const { bump, version } = useAppStore();
  const [tab, setTab] = useState<Tab>("employees");
  const master = masterRepository.get();

  return (
    <div>
      <h1 className="text-2xl mb-1">Master Data</h1>
      <p className="text-muted mb-4">
        Administrator-managed reference data. Everything here was seeded from the uploaded source documents — see
        REQUIREMENTS.md for provenance. Add rows as the company confirms additional locations, chemicals or staff.
      </p>

      <div className="pill-tabs mb-4 wrap" style={{ flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <div key={t.key} className={`pill-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === "employees" && (
        <>
          <p className="text-muted text-sm mb-3">
            Role and email drive reminders (see the Documents tab): a document's reminders go to whichever active
            employee's role contains that document's assigned keyword.
          </p>
          <EmployeesTable
            employees={master.employees}
            onAdd={() => {
              masterRepository.update({
                employees: [...master.employees, { id: generateId("emp"), name: "New Employee", role: "TO BE CONFIRMED", active: true }],
              });
              bump();
            }}
            onRemove={(i) => {
              masterRepository.update({ employees: master.employees.filter((_, idx) => idx !== i) });
              bump();
            }}
            onUpdate={(i, patch) => {
              masterRepository.update({ employees: master.employees.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
              bump();
            }}
          />
        </>
      )}

      {tab === "chemicals" && (
        <SimpleTable
          columns={["Name", "Active Ingredient", "Formulation"]}
          rows={master.chemicals.map((c) => [c.name, c.activeIngredient ?? "—", c.formulation ?? "—"])}
          onAdd={() => {
            masterRepository.update({ chemicals: [...master.chemicals, { id: generateId("chem"), name: "New Chemical" }] });
            bump();
          }}
          onRemove={(i) => {
            masterRepository.update({ chemicals: master.chemicals.filter((_, idx) => idx !== i) });
            bump();
          }}
        />
      )}

      {tab === "pcLocations" && (
        <SimpleTable
          columns={["PC ID", "Location", "Floor"]}
          rows={master.pcLocations.map((p) => [p.id, p.location, p.floor])}
          onAdd={() => {
            const nextNum = master.pcLocations.length + 1;
            masterRepository.update({
              pcLocations: [...master.pcLocations, { id: `PC-${String(nextNum).padStart(2, "0")}`, location: "TO BE CONFIRMED", floor: "TO BE CONFIRMED" }],
            });
            bump();
          }}
          onRemove={(i) => {
            masterRepository.update({ pcLocations: master.pcLocations.filter((_, idx) => idx !== i) });
            bump();
          }}
        />
      )}

      {tab === "rodentStations" && (
        <>
          {master.rodentStations.length === 0 && (
            <div className="card mb-3">
              <div className="card-pad text-sm tbc">
                No Rodent Bait Station master list was present in the uploaded source files (the Dec-2023 GAP report
                flags that station numbering was missing at the time of inspection). Add stations below once the
                company's RBS layout/numbering is confirmed.
              </div>
            </div>
          )}
          <SimpleTable
            columns={["Station ID", "Location", "Type", "Status"]}
            rows={master.rodentStations.map((r) => [r.id, r.location, r.type, r.status])}
            onAdd={() => {
              masterRepository.update({
                rodentStations: [
                  ...master.rodentStations,
                  { id: generateId("RBS"), location: "TO BE CONFIRMED", type: "TO BE CONFIRMED", status: "TO BE CONFIRMED" },
                ],
              });
              bump();
            }}
            onRemove={(i) => {
              masterRepository.update({ rodentStations: master.rodentStations.filter((_, idx) => idx !== i) });
              bump();
            }}
          />
        </>
      )}

      {tab === "areas" && (
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th>Area Name</th>
                <th>Belongs To</th>
              </tr>
            </thead>
            <tbody>
              {master.areas.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="text-sm text-muted">{a.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "checkpoints" && (
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>No.</th>
                <th>Checkpoint Text (Daily Pest Control Monitoring Record)</th>
                <th>Response Type</th>
              </tr>
            </thead>
            <tbody>
              {master.checkpoints.map((c) => (
                <tr key={c.no}>
                  <td>{c.no}</td>
                  <td className="text-sm">{c.text}</td>
                  <td>
                    <span className="badge badge-Due">{c.responseType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "documents" && (
        <>
          <p className="text-muted text-sm mb-3">
            "Assigned Role Keyword" is matched case-insensitively against each employee's Role (Employees tab) to
            decide who gets reminders for that document — e.g. "Checker" matches "Checker / Verifier — ...".
          </p>
          <div className="doc-table">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Format No.</th>
                  <th>Revision</th>
                  <th>Frequency / Schedule</th>
                  <th style={{ width: 180 }}>Assigned Role Keyword</th>
                  <th>Currently Assigned</th>
                </tr>
              </thead>
              <tbody>
                {documentRepository.getAll().map((d) => {
                  const keyword = master.documentRoleKeywords?.[d.id] ?? "";
                  const matched = resolveResponsibleEmployees(d, master);
                  return (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.name}</td>
                      <td className={d.formatNo === "TO BE CONFIRMED" ? "tbc" : ""}>{d.formatNo}</td>
                      <td className={d.revisionNo === "TO BE CONFIRMED" ? "tbc" : ""}>{d.revisionNo}</td>
                      <td className="text-sm">{scheduleLabel(d)}</td>
                      <td>
                        {d.isReferenceOnly ? (
                          <span className="text-muted text-sm">—</span>
                        ) : (
                          <input
                            className="input input-sm"
                            placeholder="e.g. Checker"
                            value={keyword}
                            onChange={(e) => {
                              masterRepository.update({
                                documentRoleKeywords: { ...(master.documentRoleKeywords ?? {}), [d.id]: e.target.value },
                              });
                              bump();
                            }}
                          />
                        )}
                      </td>
                      <td className="text-sm">
                        {d.isReferenceOnly ? (
                          <span className="text-muted">—</span>
                        ) : matched.length > 0 ? (
                          matched.map((e) => e.name).join(", ")
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "settings" && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-pad">
            <h3 className="text-base font-semibold mb-1">Working hours</h3>
            <p className="text-muted text-sm mb-3">
              The assistant's briefing pops up by itself once in the <strong>first hour</strong> of the working day ("here's
              what I've prepared") and once in the <strong>last hour</strong> — only if something is still unsubmitted
              ("before you go"). Any other time it's a click away in the top bar.
            </p>
            {(() => {
              const s = settingsRepository.get();
              return (
                <div className="flex gap-4 wrap">
                  <div className="field" style={{ minWidth: 160 }}>
                    <label>Day starts</label>
                    <input
                      type="time"
                      className="input"
                      value={s.workdayStart}
                      onChange={(e) => {
                        if (e.target.value) settingsRepository.update({ workdayStart: e.target.value });
                        bump();
                      }}
                    />
                  </div>
                  <div className="field" style={{ minWidth: 160 }}>
                    <label>Day ends</label>
                    <input
                      type="time"
                      className="input"
                      value={s.workdayEnd}
                      onChange={(e) => {
                        if (e.target.value) settingsRepository.update({ workdayEnd: e.target.value });
                        bump();
                      }}
                    />
                  </div>
                </div>
              );
            })()}
            <p className="text-xs text-faint mt-3">
              Morning briefing: {settingsRepository.get().workdayStart} for one hour · End-of-day briefing: the hour before{" "}
              {settingsRepository.get().workdayEnd}. Records dated before {settingsRepository.get().liveStartDate ?? "—"} (when this browser first ran the
              app) are treated as pre-launch and never generated or reminded about.
            </p>
          </div>
        </div>
      )}

      {tab === "holidays" && (
        <>
          <p className="text-muted text-sm mb-3">
            Company-wide holidays. A Daily Monitoring record due on one of these dates is automatically marked as a
            holiday, and no reminder fires for any document due that day.
          </p>
          <HolidaysTable
            holidays={master.holidays ?? []}
            onAdd={() => {
              masterRepository.update({
                holidays: [...(master.holidays ?? []), { id: generateId("hol"), date: todayISO(), name: "New Holiday" }],
              });
              bump();
            }}
            onRemove={(i) => {
              masterRepository.update({ holidays: (master.holidays ?? []).filter((_, idx) => idx !== i) });
              bump();
            }}
            onUpdate={(i, patch) => {
              masterRepository.update({
                holidays: (master.holidays ?? []).map((h, idx) => (idx === i ? { ...h, ...patch } : h)),
              });
              bump();
            }}
          />
        </>
      )}
    </div>
  );
}

function HolidaysTable({
  holidays,
  onAdd,
  onRemove,
  onUpdate,
}: {
  holidays: CompanyHoliday[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<CompanyHoliday>) => void;
}) {
  return (
    <div>
      <div className="doc-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: 160 }}>Date</th>
              <th>Name</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {holidays
              .slice()
              .sort((a, b) => (a.date < b.date ? -1 : 1))
              .map((h) => {
                const index = holidays.indexOf(h);
                return (
                  <tr key={h.id}>
                    <td>
                      <input type="date" className="input input-sm" value={h.date} onChange={(e) => onUpdate(index, { date: e.target.value })} />
                    </td>
                    <td>
                      <input className="input input-sm" value={h.name} onChange={(e) => onUpdate(index, { name: e.target.value })} />
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onRemove(index)}>
                        <FiTrash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            {holidays.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted text-center" style={{ padding: 16 }}>
                  No holidays added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button className="btn btn-secondary btn-sm mt-2" onClick={onAdd}>
        <FiPlus size={13} /> Add Holiday
      </button>
    </div>
  );
}

function EmployeesTable({
  employees,
  onAdd,
  onRemove,
  onUpdate,
}: {
  employees: Employee[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<Employee>) => void;
}) {
  return (
    <div>
      <div className="doc-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Email</th>
              <th style={{ width: 70 }}>Active</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e, i) => (
              <tr key={e.id}>
                <td>
                  <input className="input input-sm" value={e.name} onChange={(ev) => onUpdate(i, { name: ev.target.value })} />
                </td>
                <td>
                  <input className="input input-sm" value={e.role} onChange={(ev) => onUpdate(i, { role: ev.target.value })} />
                </td>
                <td>
                  <input
                    className="input input-sm"
                    value={e.department ?? ""}
                    onChange={(ev) => onUpdate(i, { department: ev.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="email"
                    className="input input-sm"
                    placeholder="name@company.com"
                    value={e.email ?? ""}
                    onChange={(ev) => onUpdate(i, { email: ev.target.value })}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" checked={e.active} onChange={(ev) => onUpdate(i, { active: ev.target.checked })} />
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onRemove(i)}>
                    <FiTrash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-secondary btn-sm mt-2" onClick={onAdd}>
        <FiPlus size={13} /> Add Row
      </button>
    </div>
  );
}

function SimpleTable({
  columns,
  rows,
  onAdd,
  onRemove,
}: {
  columns: string[];
  rows: string[][];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="doc-table">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, ci) => (
                  <td key={ci} className={cell === "TO BE CONFIRMED" ? "tbc" : ""}>
                    {cell}
                  </td>
                ))}
                <td>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onRemove(i)}>
                    <FiTrash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-secondary btn-sm mt-2" onClick={onAdd}>
        <FiPlus size={13} /> Add Row
      </button>
    </div>
  );
}
