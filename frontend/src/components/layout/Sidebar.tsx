import React, { useState } from "react";
import {
  FiGrid,
  FiBookOpen,
  FiCalendar,
  FiDatabase,
  FiBarChart2,
  FiAlertCircle,
  FiAward,
  FiDroplet,
  FiFileText,
  FiPlayCircle,
  FiSearch,
  FiGitBranch,
  FiShield,
  FiChevronDown,
  FiChevronRight,
  FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { Link, useRouter } from "../../store/router";
import { readJSON, writeJSON } from "../../data/storageAdapter";

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
}

const NAV_MAIN: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: FiGrid },
  { to: "/process-flow", label: "Process Flow", icon: FiGitBranch },
  { to: "/library", label: "Document Library", icon: FiBookOpen },
  { to: "/calendar", label: "Record Calendar", icon: FiCalendar },
  { to: "/search", label: "Search", icon: FiSearch },
];

// One collapsible section per module — this is the "close it and open it
// like a navbar" grouping. Keys must match DocumentDefinition.module exactly
// (see data/seed/documentDefinitions.ts); the /library/{slug} links use
// moduleSlug() so they land on Document Library pre-filtered to that module,
// which is how modules without their own dedicated list page (the lamination
// log sheets, the QC inspection records) still get a real destination here.
const MODULE_ORDER = [
  "Pest Control",
  "CAPA (Corrective & Preventive Action)",
  "Lamination — Quality Control",
  "Lamination — Production",
  "Quality Control — Inspection Records",
  "Quality — Compliance",
] as const;

const MODULE_LINKS: Record<(typeof MODULE_ORDER)[number], NavItem[]> = {
  "Pest Control": [
    { to: "/training", label: "Training Records", icon: FiAward },
    { to: "/chemical-master", label: "Chemical Master", icon: FiDroplet },
    { to: "/sop", label: "SOP Reference", icon: FiFileText },
    { to: "/library/pest-control", label: "All Pest Control Documents", icon: FiBookOpen },
  ],
  "CAPA (Corrective & Preventive Action)": [
    { to: "/gap/internal", label: "Internal — Inspection Findings", icon: FiAlertCircle },
    { to: "/gap/external", label: "External — Customer Complaints", icon: FiUsers },
  ],
  "Lamination — Quality Control": [
    { to: "/library/lamination-quality-control", label: "Lamination QC Documents", icon: FiBookOpen },
  ],
  "Lamination — Production": [
    { to: "/library/lamination-production", label: "Lamination Production Documents", icon: FiBookOpen },
  ],
  "Quality Control — Inspection Records": [
    { to: "/library/quality-control-inspection-records", label: "Inspection Record Documents", icon: FiBookOpen },
  ],
  "Quality — Compliance": [{ to: "/soc", label: "Statements of Compliance", icon: FiShield }],
};

const NAV_SYSTEM: NavItem[] = [
  { to: "/reports", label: "Reports", icon: FiBarChart2 },
  { to: "/master-data", label: "Master Data", icon: FiDatabase },
  { to: "/demo", label: "Demo Mode", icon: FiPlayCircle },
];

const SIDEBAR_STATE_KEY = "sidebar-open-modules";

function loadOpenState(): Record<string, boolean> {
  return readJSON<Record<string, boolean>>(SIDEBAR_STATE_KEY, {});
}

function NavGroup({ items, path }: { items: NavItem[]; path: string }) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = path === item.to || path.startsWith(item.to + "/");
        return (
          <Link key={item.to} to={item.to} className={active ? "active" : ""}>
            <Icon size={16} /> {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const { path } = useRouter();
  const [openState, setOpenState] = useState<Record<string, boolean>>(loadOpenState);
  // Undefined (never explicitly toggled) defaults to open — discoverable
  // without a click. Once a module has been explicitly opened or closed,
  // that choice is authoritative and persists across navigation: an earlier
  // version of this re-opened a just-collapsed module the instant you
  // navigated to any other page within it (e.g. clicking from CAPA to
  // Training), which made "closing" a module feel like it didn't stick.
  const isOpen = (module: string) => openState[module] ?? true;

  const toggle = (module: string) => {
    setOpenState((s) => {
      const next = { ...s, [module]: !isOpen(module) };
      writeJSON(SIDEBAR_STATE_KEY, next);
      return next;
    });
  };

  return (
    <aside className="app-sidebar no-print">
      <div className="app-sidebar-brand">
        <div className="title">Digital Controlled Record System</div>
        <div className="subtitle">Gujarat Printpack Publication Pvt. Ltd. · Pest Control · Lamination QC & Production · Compliance</div>
      </div>
      <nav className="app-nav">
        <NavGroup items={NAV_MAIN} path={path} />

        {MODULE_ORDER.map((module) => {
          const open = isOpen(module);
          return (
            <div key={module} className="nav-module">
              <button type="button" className="nav-module-header" onClick={() => toggle(module)} aria-expanded={open}>
                {open ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
                <span>{module}</span>
              </button>
              {open && (
                <div className="nav-module-body">
                  <NavGroup items={MODULE_LINKS[module]} path={path} />
                </div>
              )}
            </div>
          );
        })}

        <div className="nav-section-label">System</div>
        <NavGroup items={NAV_SYSTEM} path={path} />
      </nav>
      <div className="app-sidebar-foot">Phase 1 Prototype · Local data only</div>
    </aside>
  );
}
