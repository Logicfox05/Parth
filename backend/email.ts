// Thin wrapper around nodemailer's Gmail transport. Both env vars are
// optional — the reminder digest feature simply no-ops (see digest.ts)
// until GMAIL_USER/GMAIL_APP_PASSWORD are set in backend/.env, so a fresh
// install never crashes for lack of email configuration.
import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return cachedTransporter;
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) throw new Error("Email is not configured (missing GMAIL_USER/GMAIL_APP_PASSWORD).");
  await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject, html });
}
