import type { DocumentDefinition } from "../types";
import { daysInMonth, MONTH_NAMES, pad2 } from "../utils/date";

// Given a document's configured schedule, compute every date within the given
// (year, month) [month is 0-indexed] on which an instance of that document is
// due. This is the single source of truth the Calendar, Day View and the
// recurring-record generator all consume — change a document's schedule once
// and every screen reacts.
export function dueDatesInMonth(doc: DocumentDefinition, year: number, month: number): string[] {
  const dim = daysInMonth(year, month);
  const iso = (day: number) => `${year}-${pad2(month + 1)}-${pad2(day)}`;
  const s = doc.schedule;

  switch (s.type) {
    case "daily": {
      const out: string[] = [];
      for (let d = 1; d <= dim; d++) out.push(iso(d));
      return out;
    }
    case "weekly": {
      const out: string[] = [];
      for (let d = 1; d <= dim; d++) {
        const dt = new Date(year, month, d);
        if (dt.getDay() === s.weekday) out.push(iso(d));
      }
      return out;
    }
    case "fortnightly": {
      const out: string[] = [];
      const first = s.anchorDayOfMonth;
      const second = s.anchorDayOfMonth + 14;
      if (first >= 1 && first <= dim) out.push(iso(first));
      if (second >= 1 && second <= dim) out.push(iso(second));
      return out;
    }
    case "monthly": {
      const day = Math.min(s.dayOfMonth, dim);
      return [iso(day)];
    }
    case "quarterly": {
      const offset = (month - s.anchorMonth + 12) % 12;
      if (offset % 3 !== 0) return [];
      const day = Math.min(s.dayOfMonth, dim);
      return [iso(day)];
    }
    case "yearly": {
      if (month !== s.month) return [];
      const day = Math.min(s.dayOfMonth, dim);
      return [iso(day)];
    }
    case "as-required":
      return [];
    default:
      return [];
  }
}

export function scheduleLabel(doc: DocumentDefinition): string {
  const s = doc.schedule;
  switch (s.type) {
    case "daily":
      return "Every day";
    case "weekly":
      return `Every ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.weekday]}`;
    case "fortnightly":
      return `Day ${s.anchorDayOfMonth} & ${s.anchorDayOfMonth + 14} of each month`;
    case "monthly":
      return `Day ${s.dayOfMonth} of each month`;
    case "quarterly":
      return `Quarterly (day ${s.dayOfMonth}, from ${MONTH_NAMES[s.anchorMonth].slice(0, 3)})`;
    case "yearly":
      return `Yearly (${s.dayOfMonth} ${MONTH_NAMES[s.month].slice(0, 3)})`;
    case "as-required":
      return "As Required (created manually)";
    default:
      return "TO BE CONFIRMED";
  }
}
