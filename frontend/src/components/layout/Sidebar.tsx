import React, { useEffect, useState } from "react";
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
  FiChevronsDown,
  FiChevronsUp,
  FiUsers,
  FiClipboard,
  FiTruck,
  FiTrendingUp,
  FiActivity,
  FiHome,
  FiLayers,
  FiMessageSquare,
  FiPackage,
  FiCheckSquare,
  FiX,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { Link, useRouter } from "../../store/router";
import { readJSON, writeJSON } from "../../data/storageAdapter";
import { useSidebar } from "../../store/sidebar";
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

type ModuleName = (typeof MODULE_ORDER)[number];

// A face for each module, so a closed panel of six headers is still scannable
// at a glance rather than six identical rows of text.
const MODULE_ICONS: Record<ModuleName, IconType> = {
  "Pest Control": FiActivity,
  "CAPA (Corrective & Preventive Action)": FiAlertCircle,
  "Lamination — Quality Control": FiLayers,
  "Lamination — Production": FiPackage,
  "Quality Control — Inspection Records": FiCheckSquare,
  "Quality — Compliance": FiShield,
};

const MODULE_LINKS: Record<ModuleName, NavEntry[]> = {
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

// One place decides whether a link is the page you're on, so the module header
// can light up for exactly the same reason its child link does.
const isActivePath = (path: string, to: string): boolean => path === to || path.startsWith(to + "/");

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
        const active = isActivePath(path, item.to);
        return (
          <Link key={item.to} to={item.to} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <span className="nav-icon">
              <Icon size={16} />
            </span>
            <span className="nav-label">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const { path } = useRouter();
  const t = useT();
  const { visible, narrow, close } = useSidebar();
  const [openState, setOpenState] = useState<Record<string, boolean>>(loadOpenState);
  // Undefined (never explicitly toggled) defaults to open — discoverable
  // without a click. Once a module has been explicitly opened or closed,
  // that choice is authoritative and persists across navigation: an earlier
  // version of this re-opened a just-collapsed module the instant you
  // navigated to any other page within it (e.g. clicking from CAPA to
  // Training), which made "closing" a module feel like it didn't stick.
  const isOpen = (module: string) => openState[module] ?? true;
  const allOpen = MODULE_ORDER.every((m) => isOpen(m));

  const persist = (next: Record<string, boolean>) => {
    writeJSON(SIDEBAR_STATE_KEY, next);
    setOpenState(next);
  };

  const toggle = (module: string) => persist({ ...openState, [module]: !isOpen(module) });
  // One control for "show me everything" / "get it out of the way", instead of
  // six clicks. Explicit either way, so it obeys the same stickiness rule.
  const toggleAll = () => persist(Object.fromEntries(MODULE_ORDER.map((m) => [m, !allOpen])));

  // As an overlay drawer the panel sits on top of the page, so going somewhere
  // has to put it away again — including when the assistant navigates for you.
  useEffect(() => {
    if (narrow) close();
  }, [path, narrow, close]);

  // Escape closes the drawer, the way every other overlay in the app does.
  useEffect(() => {
    if (!narrow || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [narrow, visible, close]);

  return (
    <>
      {narrow && visible && <div className="sidebar-backdrop no-print" onClick={close} aria-hidden="true" />}
      <aside
        id="app-sidebar"
        className={`app-sidebar no-print ${visible ? "is-open" : "is-closed"} ${narrow ? "is-drawer" : ""}`}
        aria-hidden={visible ? undefined : true}
        aria-label={t("nav.menu")}
      >
        <div className="app-sidebar-brand">
          <div className="brand-text">
            <div className="title">{t("dash.title")}</div>
            <div className="subtitle">{t("nav.brandSubtitle")}</div>
          </div>
          <button
            type="button"
            className="sidebar-close"
            data-action="close-sidebar"
            onClick={close}
            title={t("nav.closeMenu")}
            aria-label={t("nav.closeMenu")}
            aria-controls="app-sidebar"
            aria-expanded={visible}
          >
            <FiX size={16} />
          </button>
        </div>

        <nav className="app-nav">
          <div className="nav-section-label">{t("nav.workspace")}</div>
          <NavGroup items={NAV_MAIN} path={path} />

          <div className="nav-section-label with-action">
            <span>{t("nav.modules")}</span>
            <button
              type="button"
              className="nav-section-action"
              data-action="toggle-all-modules"
              onClick={toggleAll}
              title={allOpen ? t("nav.collapseAll") : t("nav.expandAll")}
              aria-label={allOpen ? t("nav.collapseAll") : t("nav.expandAll")}
            >
              {allOpen ? <FiChevronsUp size={13} /> : <FiChevronsDown size={13} />}
            </button>
          </div>

          {MODULE_ORDER.map((module) => {
            const open = isOpen(module);
            const ModuleIcon = MODULE_ICONS[module];
            // Marked whether the module is open or shut, so a collapsed module
            // still tells you the page you're on lives inside it.
            const holdsCurrentPage = MODULE_LINKS[module].some((entry) => !isHeading(entry) && isActivePath(path, entry.to));
            return (
              <div key={module} className={`nav-module ${open ? "open" : "closed"} ${holdsCurrentPage ? "current" : ""}`}>
                <button
                  type="button"
                  className="nav-module-header"
                  onClick={() => toggle(module)}
                  aria-expanded={open}
                  title={t(`module.${module}`)}
                >
                  <span className="nav-icon">
                    <ModuleIcon size={15} />
                  </span>
                  <span className="nav-module-name">{t(`module.${module}`)}</span>
                  {holdsCurrentPage && !open && <span className="nav-module-dot" title={t("nav.currentSection")} />}
                  <FiChevronDown size={13} className="nav-module-chevron" />
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
    </>
  );
}
