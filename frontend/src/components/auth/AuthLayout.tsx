import React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="title">Digital Controlled Record System</div>
          <div className="subtitle">Gujarat Printpack Publication Pvt. Ltd. · Pest Control Module</div>
        </div>
        {children}
      </div>
    </div>
  );
}
