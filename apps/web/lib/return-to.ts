export function sanitizeReturnTo(
  value: string | string[] | undefined,
  fallback: string = "/reading"
): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate;
}
