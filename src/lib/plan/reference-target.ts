const HTTP_URL_PATTERN = /^https?:\/\/.+/;
const SCHEME_LIKE_PREFIX_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function isHttpReferenceTarget(target: string): boolean {
  return HTTP_URL_PATTERN.test(target);
}

export function isSafeRelativeReferencePath(target: string): boolean {
  if (target.length === 0 || target.trim() !== target) return false;
  if (target.includes("\0") || SCHEME_LIKE_PREFIX_PATTERN.test(target)) {
    return false;
  }
  if (/^[\\/]/.test(target)) return false;

  const segments = target.split(/[\\/]+/);
  if (segments.length === 0) return false;

  const lastSegment = segments[segments.length - 1];
  if (lastSegment === "" || lastSegment === "." || lastSegment === "..") {
    return false;
  }

  return !segments.some((segment) => segment === "..");
}

export function isReferenceTarget(target: string): boolean {
  return isHttpReferenceTarget(target) || isSafeRelativeReferencePath(target);
}
