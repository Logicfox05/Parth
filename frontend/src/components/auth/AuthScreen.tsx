import React, { useState } from "react";
import { AuthLayout } from "./AuthLayout";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <AuthLayout>
      {mode === "login" ? (
        <LoginForm onSwitchToSignup={() => setMode("signup")} />
      ) : (
        <SignupForm onSwitchToLogin={() => setMode("login")} />
      )}
    </AuthLayout>
  );
}
