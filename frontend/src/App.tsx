import React from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { useRouter } from "./store/router";
import { AssistantProvider } from "./store/AssistantContext";
import { DocumentAssistant } from "./components/common/DocumentAssistant";
import { AssistantBriefingPopup } from "./components/common/AssistantBriefingPopup";

import { DashboardPage } from "./pages/DashboardPage";
import { ProcessFlowPage } from "./pages/ProcessFlowPage";
import { DocumentLibraryPage } from "./pages/DocumentLibraryPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DayViewPage } from "./pages/DayViewPage";
import { RecordPage } from "./pages/RecordPage";
import { GapListPage, GapRecordPage } from "./pages/GapPage";
import { CapaHomePage, ComplaintListPage, ComplaintChecklistPage } from "./pages/CapaPage";
import { TrainingListPage, TrainingRecordPage } from "./pages/TrainingPage";
import { ChemicalMasterPage } from "./pages/ChemicalMasterPage";
import { SopReferencePage } from "./pages/SopReferencePage";
import { ComplianceDetailPage, ComplianceListPage } from "./pages/CompliancePage";
import { ReportsPage } from "./pages/ReportsPage";
import { MasterDataPage } from "./pages/MasterDataPage";
import { DemoModePage } from "./pages/DemoModePage";
import { SearchPage } from "./pages/SearchPage";

function NotFoundPage() {
  return (
    <div className="empty-state">
      <h2 className="text-xl mb-2">Page not found</h2>
      <p>The screen you're looking for doesn't exist yet.</p>
    </div>
  );
}

function RouteSwitch() {
  const { segments } = useRouter();
  const [root, ...rest] = segments;

  switch (root) {
    case undefined:
    case "dashboard":
      return <DashboardPage />;
    case "process-flow":
      return <ProcessFlowPage />;
    case "library":
      return <DocumentLibraryPage moduleSlug={rest[0]} />;
    case "calendar":
      // key forces a full remount on a genuine route change (e.g. the
      // assistant sending you to a specific month while already on this
      // page) so the very first render already reflects the new month —
      // CalendarPage's y/m state has no prop-resync effect of its own, so
      // without this a deep link to a new month while already mounted here
      // would silently keep showing the old one.
      return <CalendarPage key={rest.join("/")} year={rest[0] ? Number(rest[0]) : undefined} month={rest[1] ? Number(rest[1]) : undefined} />;
    case "day":
      return <DayViewPage date={rest[0]} />;
    case "record":
      return <RecordPage recordId={rest[0]} />;
    case "gap":
      // /gap → Internal-or-External chooser; /gap/internal, /gap/external →
      // the two lists; /gap/complaint/{id} → a complaint checklist;
      // /gap/{id} → an internal findings report (kept for existing links).
      if (!rest[0]) return <CapaHomePage />;
      if (rest[0] === "internal") return <GapListPage />;
      if (rest[0] === "external") return <ComplaintListPage />;
      if (rest[0] === "complaint") return rest[1] ? <ComplaintChecklistPage key={rest[1]} recordId={rest[1]} /> : <ComplaintListPage />;
      return <GapRecordPage recordId={rest[0]} />;
    case "training":
      return rest[0] ? <TrainingRecordPage recordId={rest[0]} /> : <TrainingListPage />;
    case "chemical-master":
      return <ChemicalMasterPage />;
    case "sop":
      return <SopReferencePage />;
    case "soc":
      return rest[0] ? <ComplianceDetailPage documentId={rest[0]} /> : <ComplianceListPage />;
    case "reports":
      // Same reasoning as Calendar's key above: forces a clean remount on a
      // genuine route change instead of relying solely on ReportsPage's own
      // props-resync effect, which otherwise paints the previous month for
      // one frame before catching up (effects run after paint).
      return (
        <ReportsPage
          key={rest.join("/")}
          initialYear={rest[0] ? Number(rest[0]) : undefined}
          initialMonth={rest[1] ? Number(rest[1]) : undefined}
          initialTab={rest[2]}
        />
      );
    case "master-data":
      return <MasterDataPage />;
    case "demo":
      return <DemoModePage />;
    case "search":
      return <SearchPage />;
    default:
      return <NotFoundPage />;
  }
}

export function App() {
  return (
    <AssistantProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="app-main">
          <Topbar />
          <div className="app-content">
            <RouteSwitch />
          </div>
        </div>
      </div>
      <DocumentAssistant />
      <AssistantBriefingPopup />
    </AssistantProvider>
  );
}
