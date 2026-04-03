export type IconPreset =
  | "github"
  | "gitlab"
  | "jira"
  | "confluence"
  | "file"
  | "external";

export function detectLinkPreset(
  href: string,
  kind: "external_url" | "bundled_document",
): IconPreset {
  if (kind === "bundled_document") {
    return "file";
  }

  let hostname: string;
  let pathname: string;
  try {
    const url = new URL(href);
    hostname = url.hostname.toLowerCase();
    pathname = url.pathname.toLowerCase();
  } catch {
    return "external";
  }

  if (hostname === "github.com" || hostname.includes("github")) {
    return "github";
  }

  if (hostname === "gitlab.com" || hostname.includes("gitlab")) {
    return "gitlab";
  }

  if (hostname.endsWith(".atlassian.net")) {
    return pathname.includes("/wiki/") ? "confluence" : "jira";
  }

  if (hostname.includes("jira")) {
    return "jira";
  }

  if (hostname.includes("confluence")) {
    return "confluence";
  }

  return "external";
}
