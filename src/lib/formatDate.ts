// Formats a date string (YYYY-MM-DD) to 'Month DD, YYYY' (e.g., May 21, 2026)
export function formatDateString(dateStr: string): string {
  if (!dateStr) return "No date provided";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
