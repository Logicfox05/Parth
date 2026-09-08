import React from "react";
import { FiUser, FiPlayCircle, FiCheckCircle, FiLogOut, FiZap } from "react-icons/fi";
import { useAppStore } from "../../store/AppStore";
import { useAuth } from "../../store/AuthContext";
import { useRouter } from "../../store/router";
import { NotificationBell } from "./NotificationBell";
import { openBriefing } from "../common/AssistantBriefingPopup";

export function Topbar() {
  const { mode, setMode } = useAppStore();
  const { user, logout } = useAuth();
  const { navigate } = useRouter();

  return (
    <>
      <div className="app-topbar no-print">
        <div className="flex items-center gap-3">
          <div className="pill-tabs">
            <div
              className={`pill-tab ${mode === "live" ? "active" : ""}`}
              onClick={() => setMode("live")}
              title="Live Mode: actual company operation"
            >
              <FiCheckCircle size={13} style={{ marginRight: 5, verticalAlign: -2 }} />
              Live Mode
            </div>
            <div
              className={`pill-tab ${mode === "demo" ? "active" : ""}`}
              onClick={() => {
                setMode("demo");
                navigate("/demo");
              }}
              title="Demo Mode: synthetic data for testing & demonstrations"
            >
              <FiPlayCircle size={13} style={{ marginRight: 5, verticalAlign: -2 }} />
              Demo Mode
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm" onClick={openBriefing} title="What has your assistant prepared for you today?">
            <FiZap size={13} /> Today's briefing
          </button>
          <NotificationBell />
          <div className="flex items-center gap-2" title={user?.email}>
            <FiUser size={15} className="text-muted" />
            <span className="text-sm font-semibold">{user?.name}</span>
            {user?.role === "admin" && <span className="badge badge-Verified">Admin</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => logout()} title="Log out">
            <FiLogOut size={13} /> Log Out
          </button>
        </div>
      </div>
      <div className={`mode-banner no-print ${mode}`}>
        {mode === "demo"
          ? "DEMO MODE — records shown/created here are synthetic test data, not real company records."
          : "LIVE MODE — actual company operation. Records here are real controlled records."}
      </div>
    </>
  );
}
