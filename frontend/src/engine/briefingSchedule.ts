import { settingsRepository, type BriefingSlot } from "../data/repositories/settingsRepository";
import { todayISO } from "../utils/date";

// WHEN THE BRIEFING POPS UP BY ITSELF. The working day is 09:00–18:00 by
// default (Master Data → Settings). The assistant interrupts at most three
// times, ever, per day per browser:
//   "first"   — the very first time this browser opens the app, whatever the
//               clock says (onboarding — otherwise a new user might not see
//               it for a day).
//   "morning" — once during the first hour of the day (09:00–10:00): "here's
//               what I've prepared".
//   "evening" — once during the last hour (17:00–18:00), and ONLY if
//               something is still unsubmitted: "before you go…".
// Anything else is on demand from the top bar. A slot is recorded the moment
// it shows, so a reload never repeats it.

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function slotForTime(now: Date, workdayStart: string, workdayEnd: string): Exclude<BriefingSlot, "first"> | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = minutesOf(workdayStart);
  const end = minutesOf(workdayEnd);
  if (mins >= start && mins < start + 60) return "morning";
  if (mins >= end - 60 && mins < end) return "evening";
  return null;
}

// Which automatic briefing (if any) is due right now. `hasPending` is only
// consulted for the evening slot.
export function dueBriefingSlot(now: Date, hasPending: () => boolean): BriefingSlot | null {
  const s = settingsRepository.get();
  if (!s.briefingFirstShownAt) return "first";
  const shown = settingsRepository.briefingSlotsShownOn(todayISO());
  const slot = slotForTime(now, s.workdayStart, s.workdayEnd);
  if (!slot || shown.includes(slot)) return null;
  if (slot === "evening" && !hasPending()) return null;
  return slot;
}

export function recordBriefingShown(slot: BriefingSlot): void {
  settingsRepository.markBriefingShown(todayISO(), slot);
}
