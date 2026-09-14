// Formats a date string (YYYY-MM-DD) to 'Month DD, YYYY' (e.g., May 21, 2026)
// NOTE: "YYYY-MM-DD" parses as UTC midnight in `new Date()`, which renders
// as the previous day in timezones behind UTC. Construct a local date instead.
export function formatDateString(dateStr: string): string {
  if (!dateStr) return "No date provided";
  const datePart = dateStr.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return dateStr;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Today's date as YYYY-MM-DD in *local* time (toISOString() is UTC and can
// be off by one near midnight).
export function getLocalTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
