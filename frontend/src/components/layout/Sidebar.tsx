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
  FiClipboard,
  FiTruck,
  FiTrendingUp,
  FiActivity,
  FiHome,
  FiMessageSquare,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { Link, useRouter } from "../../store/router";
import { readJSON, writeJSON } from "../../data/storageAdapter";
import { useT } from "../../i18n";

interface NavItem {
  to: string;
  // Translation key — the label itself lives in src/i18n/strings.ts so the
  // whole navigation changes with the language.
  labelKey: string;
  icon: IconType;
}

// A module's body is a list of links, optionally broken up by small
// sub-headings — the Pest Control module uses these for the groups the
// department itself thinks in (Daily Report / Service Reports / Trend
// Analysis / Training & Reference).
type NavEntry = NavItem | { headingKey: string };
const isHeading = (e: NavEntry): e is { headingKey: string } => "headingKey" in e;

const NAV_MAIN: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: FiGrid },
  // The assistant as a screen of its own (ChatGPT-style, text and voice) —
  // the same assistant as the floating widget, see pages/AssistantPage.tsx.
  { to: "/assistant", labelKey: "nav.assistant", icon: FiMessageSquare },
  { to: "/process-flow", labelKey: "nav.processFlow", icon: FiGitBranch },
  { to: "/library", labelKey: "nav.documentLibrary", icon: FiBookOpen },
  { to: "/calendar", labelKey: "nav.recordCalendar", icon: FiCalendar },
  { to: "/search", labelKey: "nav.search", icon: FiSearch },
];

// One collapsible section per module — this is the "close it and open it
// like a navbar" grouping. Keys must match DocumentDefinition.module exactly
// (see data/seed/documentDefinitions.ts) — they are identifiers, not display
// text; the visible name comes from t(`module.${module}`). The /library/{slug}
// links use moduleSlug() so they land on Document Library pre-filtered to that
// module, which is how modules without their own dedicated list page (the
// lamination log sheets, the QC inspection records) still get a real
// destination here.
const MODULE_ORDER = [
  "Pest Control",
  "CAPA (Corrective & Preventive Action)",
  "Lamination — Quality Control",
  "Lamination — Production",
  "Quality Control — Inspection Records",
  "Quality — Compliance",
] as const;

const MODULE_LINKS: Record<(typeof MODULE_ORDER)[number], NavEntry[]> = {
  // Organised the way the pest-control paperwork actually falls (see
  // src/pages/PestControlPages.tsx): the daily report, Gurudev Pest
  // Control's three service reports, the two trend analyses drawn from
  // them, and the training / reference material.
  "Pest Control": [
    { to: "/pest-control", labelKey: "nav.overview", icon: FiHome },
    { headingKey: "nav.dailyReport" },
    { to: "/pest/daily", labelKey: "nav.dailyPestMonitoring", icon: FiClipboard },
    { headingKey: "nav.serviceReports" },
    { to: "/pest/service/rodent", labelKey: "nav.ratMice", icon: FiTruck },
    { to: "/pest/service/general", labelKey: "nav.antsCockroaches", icon: FiTruck },
    { to: "/pest/service/fly", labelKey: "nav.flyControl", icon: FiTruck },
    { headingKey: "nav.trendAnalysis" },
    { to: "/pest/trend/rodent", labelKey: "nav.rodentTrend", icon: FiTrendingUp },
    { to: "/pest/trend/fly-catcher", labelKey: "nav.flyCatcherInfestation", icon: FiActivity },
    { headingKey: "nav.trainingReference" },
    { to: "/training", labelKey: "nav.trainingRecords", icon: FiAward },
    { to: "/chemical-master", labelKey: "nav.chemicalMaster", icon: FiDroplet },
    { to: "/sop", labelKey: "nav.sopReference", icon: FiFileText },
    { to: "/licence", labelKey: "nav.licence", icon: FiShield },
  ],
  "CAPA (Corrective & Preventive Action)": [
    { to: "/gap/internal", labelKey: "nav.capaInternal", icon: FiAlertCircle },
    { to: "/gap/external", labelKey: "nav.capaExternal", icon: FiUsers },
  ],
  "Lamination — Quality Control": [{ to: "/library/lamination-quality-control", labelKey: "nav.laminationQcDocs", icon: FiBookOpen }],
  "Lamination — Production": [{ to: "/library/lamination-production", labelKey: "nav.laminationProductionDocs", icon: FiBookOpen }],
  "Quality Control — Inspection Records": [{ to: "/library/quality-control-inspection-records", labelKey: "nav.inspectionRecordDocs", icon: FiBookOpen }],
  "Quality — Compliance": [{ to: "/soc", labelKey: "nav.statementsOfCompliance", icon: FiShield }],
};

const NAV_SYSTEM: NavItem[] = [
  { to: "/reports", labelKey: "nav.reports", icon: FiBarChart2 },
  { to: "/master-data", labelKey: "nav.masterData", icon: FiDatabase },
  { to: "/demo", labelKey: "nav.demoMode", icon: FiPlayCircle },
];

const SIDEBAR_STATE_KEY = "sidebar-open-modules";

function loadOpenState(): Record<string, boolean> {
  return readJSON<Record<string, boolean>>(SIDEBAR_STATE_KEY, {});
}

function NavGroup({ items, path }: { items: NavEntry[]; path: string }) {
  const t = useT();
  return (
    <>
      {items.map((item, i) => {
        if (isHeading(item)) {
          return (
            <div key={`heading-${i}`} className="nav-sub-label">
              {t(item.headingKey)}
            </div>
          );
        }
        const Icon = item.icon;
        const active = path === item.to || path.startsWith(item.to + "/");
        return (
          <Link key={item.to} to={item.to} className={active ? "active" : ""}>
            <Icon size={16} /> {t(item.labelKey)}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const { path } = useRouter();
  const t = useT();
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
        <div className="title">{t("dash.title")}</div>
        <div className="subtitle">{t("nav.brandSubtitle")}</div>
      </div>
      <nav className="app-nav">
        <NavGroup items={NAV_MAIN} path={path} />

        {MODULE_ORDER.map((module) => {
          const open = isOpen(module);
          return (
            <div key={module} className="nav-module">
              <button type="button" className="nav-module-header" onClick={() => toggle(module)} aria-expanded={open}>
                {open ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
                <span>{t(`module.${module}`)}</span>
              </button>
              {open && (
                <div className="nav-module-body">
                  <NavGroup items={MODULE_LINKS[module]} path={path} />
                </div>
              )}
            </div>
          );
        })}

        <div className="nav-section-label">{t("nav.system")}</div>
        <NavGroup items={NAV_SYSTEM} path={path} />
      </nav>
      <div className="app-sidebar-foot">{t("nav.foot")}</div>
    </aside>
  );
}
