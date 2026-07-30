const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const PAKISTANI_MOBILE_PATTERN = /^923\d{9}$/;

export const isValidE164Number = (value: string) => E164_PATTERN.test(value);

export const normalizePakistaniWhatsAppNumber = (
  input: string | null | undefined,
): string | null => {
  const value = input?.trim();
  if (!value) return null;

  const cleaned = value.replace(/[\s\-()[\]]/g, "");
  let normalized: string;
  if (/^03\d{9}$/.test(cleaned)) normalized = `92${cleaned.slice(1)}`;
  else if (/^3\d{9}$/.test(cleaned)) normalized = `92${cleaned}`;
  else if (/^\+?92\d{10}$/.test(cleaned))
    normalized = cleaned.replace(/^\+/, "");
  else throw new Error("Enter a valid Pakistani WhatsApp number");

  if (!PAKISTANI_MOBILE_PATTERN.test(normalized)) {
    throw new Error("Enter a valid Pakistani WhatsApp number");
  }
  return normalized;
};

export const buildWhatsAppClickToChatUrl = (
  number: string | null | undefined,
  message: string,
) => {
  const normalized = normalizePakistaniWhatsAppNumber(number);
  if (!normalized) throw new Error("A WhatsApp number is required");
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "wa.me" ||
    parsed.pathname !== `/${normalized}` ||
    parsed.searchParams.get("text") !== message
  ) {
    throw new Error("The generated WhatsApp URL is malformed");
  }
  return url;
};
