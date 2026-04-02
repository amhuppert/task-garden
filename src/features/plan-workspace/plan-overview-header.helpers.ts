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

// ---------------------------------------------------------------------------
// deriveReferenceLabel
// ---------------------------------------------------------------------------

/**
 * Produces a short human-readable label from a reference target string.
 *
 * - Repo-relative `.md` paths → filename without extension
 * - http/https URLs → hostname + pathname (without protocol)
 * - Anything else → raw target string
 */
export function deriveReferenceLabel(target: string): string {
  // External URL
  if (/^https?:\/\//.test(target)) {
    try {
      const url = new URL(target);
      const path = url.pathname === "/" ? "" : url.pathname;
      return `${url.hostname}${path}`;
    } catch {
      return target;
    }
  }

  // Repo-relative .md path → use the filename without extension
  if (/^[a-zA-Z0-9].*\.md$/.test(target)) {
    const parts = target.split("/");
    const filename = parts[parts.length - 1];
    return filename.replace(/\.md$/, "");
  }

  return target;
}
