const SENSITIVE_KEY = /token|authorization|secret|credential/i;

const sanitize = (value: unknown, depth: number): unknown => {
  if (depth > 5) return "[truncated]";
  if (typeof value === "string") return value.slice(0, 1000);
  if (value === null || typeof value === "number" || typeof value === "boolean")
    return value;
  if (Array.isArray(value))
    return value.slice(0, 25).map((item) => sanitize(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([key, item]) => [
          key,
          SENSITIVE_KEY.test(key) ? "[redacted]" : sanitize(item, depth + 1),
        ]),
    );
  }
  return String(value).slice(0, 1000);
};

export const sanitizeProviderResponse = (value: unknown) => sanitize(value, 0);
