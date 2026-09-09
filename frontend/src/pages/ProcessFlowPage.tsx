import React from "react";
import { useAppStore } from "../store/AppStore";
import { recordRepository } from "../data/repositories/recordRepository";
import { documentRepository } from "../data/repositories/documentRepository";
import { allGapFindings, openCorrectiveActionsCount } from "../data/selectors";
import { formatDisplayDate, pad2, todayISO } from "../utils/date";
import { DemoTag } from "../components/common/DemoTag";
import { useT } from "../i18n";

// The three document kinds that represent an actual pest-control inspection
// / monitoring visit (as opposed to CAPA, training, or reference material).
const MONITORING_KINDS = ["daily-pest-monitoring", "fly-catcher", "service-report"];
const COMPLETED_STATUSES = ["Submitted", "Pending Verification", "Verified"];

interface Stage {
  lines: string[]; // manually pre-wrapped — SVG <text> doesn't auto-wrap
  value: number;
  color: string;
  hint: string;
}

// Live counts only, computed from data that's actually populated — no stage
// here relies on GapFinding.status === "Verified", which this app never
// actually sets (confirmed by code search), so it would always read 0.
export function ProcessFlowPage() {
  const t = useT();
  const { mode } = useAppStore();
  const isDemo = mode === "demo";
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;

  const inspectionsLogged = documentRepository
    .getRecordable()
    .filter((d) => MONITORING_KINDS.includes(d.kind))
    .reduce((sum, d) => {
      const count = recordRepository
        .query({ documentId: d.id, isDemo })
        .filter((r) => COMPLETED_STATUSES.includes(r.status) && r.dueDate.startsWith(monthPrefix)).length;
      return sum + count;
    }, 0);

  const allFindings = allGapFindings(isDemo);
  const findingsRaised = allFindings.length;
  const correctiveActionOpen = openCorrectiveActionsCount(isDemo);
  const closed = allFindings.filter(({ finding }) => finding.status === "Closed").length;

  const stages: Stage[] = [
    {
      lines: ["Inspections", "Logged"],
      value: inspectionsLogged,
      color: "var(--color-info)",
      hint: "Daily Monitoring / Fly Catcher / Service Report records completed this month.",
    },
    {
      lines: ["CAPA Findings", "Raised"],
      value: findingsRaised,
      color: "var(--color-primary)",
      hint: "Total findings ever logged across all CAPA records.",
    },
    {
      lines: ["Corrective Action", "Open"],
      value: correctiveActionOpen,
      color: "var(--color-warning)",
      hint: "Findings still Open or Overdue.",
    },
    {
      lines: ["Closed"],
      value: closed,
      color: "var(--color-success)",
      hint: "Findings marked Closed.",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl mb-1">{t("flow.title")}</h1>
        {isDemo && <DemoTag />}
      </div>
      <p className="text-muted mb-4">
        How pest-control monitoring flows into CAPA findings and their resolution — {isDemo ? "demo" : "live"} counts,
        as of {formatDisplayDate(todayISO())}.
      </p>

      <div className="card">
        <div className="card-pad" style={{ overflowX: "auto" }}>
          <FlowDiagram stages={stages} />
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-pad">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {stages.map((s) => (
              <li key={s.lines.join(" ")} className="text-sm mb-2">
                <strong>{s.lines.join(" ")}:</strong> <span className="text-muted">{s.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function FlowDiagram({ stages }: { stages: Stage[] }) {
  const boxW = 200;
  const boxH = 120;
  const gap = 70;
  const padTop = 10;
  const totalW = stages.length * boxW + (stages.length - 1) * gap;
  const totalH = boxH + padTop * 2;
  const centerY = padTop + boxH / 2;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      style={{ width: "100%", minWidth: 560, height: "auto", display: "block" }}
      role="img"
      aria-label="Process flow: inspections logged, CAPA findings raised, corrective action open, closed"
    >
      <defs>
        <marker id="flow-arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--color-text-muted)" />
        </marker>
      </defs>
      {stages.map((stage, i) => {
        const x = i * (boxW + gap);
        return (
          <g key={stage.lines.join(" ")}>
            <rect x={x} y={padTop} width={boxW} height={boxH} rx={10} fill="var(--color-surface)" stroke={stage.color} strokeWidth={2} />
            {stage.lines.map((line, li) => (
              <text
                key={li}
                x={x + boxW / 2}
                y={padTop + 26 + li * 16}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill="var(--color-text)"
              >
                {line}
              </text>
            ))}
            <text x={x + boxW / 2} y={padTop + boxH - 24} textAnchor="middle" fontSize={30} fontWeight={800} fill={stage.color}>
              {stage.value}
            </text>
            {i < stages.length - 1 && (
              <line
                x1={x + boxW}
                y1={centerY}
                x2={x + boxW + gap - 4}
                y2={centerY}
                stroke="var(--color-text-muted)"
                strokeWidth={2}
                markerEnd="url(#flow-arrowhead)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
