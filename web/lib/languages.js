export const LANGUAGE_NAMES = {
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  mr: "Marathi",
  pa: "Punjabi",
  bn: "Bengali",
  gu: "Gujarati",
  en: "English",
};

/** Returns the full language name for an ISO 639-1 code, or the code itself as fallback. */
export function languageName(code) {
  if (!code) return "";
  return LANGUAGE_NAMES[code] ?? code;
}
