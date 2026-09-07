const KOREA_TIME_ZONE = "Asia/Seoul";

export function formatDateTime(value: string | null) {
  if (!value) return "미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: KOREA_TIME_ZONE,
  }).format(date);
}

export function formatTimeOnly(value: string | null) {
  if (!value) return "미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: KOREA_TIME_ZONE }).format(date);
}

export function formatDateOnly(value: string | null) {
  if (!value) return "미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: KOREA_TIME_ZONE }).format(date);
}

/**
 * `<input type="datetime-local">` (and the auto-generator's round-time calc) produce a
 * naive "YYYY-MM-DDTHH:MM" string with no timezone. Postgres/Supabase treats a naive
 * timestamp as UTC, which silently shifts every scheduled_at by 9 hours from the Korea
 * wall-clock time the operator actually typed. Anchoring it to +09:00 before it's ever
 * written stores the correct instant, so display (always rendered in Asia/Seoul above)
 * round-trips back to the exact time that was entered.
 */
export function toKoreaTimestamp(naiveLocalDateTime: string): string {
  return `${naiveLocalDateTime}:00+09:00`;
}

/**
 * Inverse of toKoreaTimestamp — converts a stored UTC instant back into the
 * naive "YYYY-MM-DDTHH:MM" Korea wall-clock string a <input type="datetime-local">
 * needs as its defaultValue. Without this, the input shows the raw UTC digits
 * as if they were already Korea time, and resubmitting the form (even
 * untouched) re-applies +09:00 on top of that, shifting scheduled_at by
 * another 9 hours every time the match is saved.
 */
export function toKoreaLocalInputValue(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}
