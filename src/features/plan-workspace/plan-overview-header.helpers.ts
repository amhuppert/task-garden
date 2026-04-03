// ---------------------------------------------------------------------------
// formatLastUpdated
// ---------------------------------------------------------------------------

/**
 * Converts an ISO date string (YYYY-MM-DD or full ISO 8601) into a
 * human-readable English date such as "March 15, 2026".
 */
export function formatLastUpdated(dateStr: string): string {
  // Append time component so Date parsing is treated as local, not UTC midnight.
  const normalized = dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`;
  const date = new Date(normalized);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
