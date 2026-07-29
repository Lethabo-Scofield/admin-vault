/**
 * Deterministic text helpers for generated documents.
 * No LLMs: everything is derived from stored database values.
 */

export type PronounKey = "SHE_HER" | "HE_HIM" | "THEY_THEM";

export interface PronounSet {
  subject: string; // she / he / they
  object: string; // her / him / them
  possessive: string; // her / his / their
}

const PRONOUN_MAP: Record<PronounKey, PronounSet> = {
  SHE_HER: { subject: "she", object: "her", possessive: "her" },
  HE_HIM: { subject: "he", object: "him", possessive: "his" },
  THEY_THEM: { subject: "they", object: "them", possessive: "their" },
};

/**
 * Resolve a stored pronoun value. Pronouns are always selected explicitly by
 * the admin — never inferred from the intern's name. Unknown/empty values fall
 * back to gender-neutral THEY_THEM so documents are never mixed or wrong.
 */
export function pronounSet(value: string | null | undefined): PronounSet {
  const key = String(value ?? "").trim().toUpperCase() as PronounKey;
  return PRONOUN_MAP[key] ?? PRONOUN_MAP.THEY_THEM;
}

export function isValidPronounKey(value: string): value is PronounKey {
  return value in PRONOUN_MAP;
}

/** "a" or "an" for a role, based on the sound of its first letter. */
export function articleFor(word: string): "a" | "an" {
  const w = String(word ?? "").trim();
  if (!w) return "a";
  // Vowel letters cover the roles used here (AI, ML → "an"; Software → "a").
  // "AI", "ML", "SRE" etc. read letter-by-letter: A, E, F, H, I, L, M, N, O,
  // R, S, X start with a vowel sound when spoken as letters.
  const first = w[0];
  const isAcronym = /^[A-Z]{2}/.test(w) || /^[A-Z][A-Z/]/.test(w);
  if (isAcronym) {
    return "AEFHILMNORSX".includes(first) ? "an" : "a";
  }
  return "aeiouAEIOU".includes(first) ? "an" : "a";
}

/**
 * Human duration between two ISO dates, e.g. "a three-month internship",
 * "a six-week internship". Never hardcodes "three-month".
 */
export function durationText(
  startDate: string | null | undefined,
  completionDate: string | null | undefined
): string {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(completionDate);
  if (!start || !end || end < start) return "an internship";

  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  const months = Math.round(days / 30.44);
  if (months >= 2) {
    return `a ${numberWord(months)}-month internship`;
  }
  const weeks = Math.max(1, Math.round(days / 7));
  if (weeks >= 2) {
    return `a ${numberWord(weeks)}-week internship`;
  }
  return `a ${days}-day internship`;
}

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve",
];

function numberWord(n: number): string {
  return n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}

export function parseIsoDate(v: string | Date | null | undefined): Date | null {
  const s =
    v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "20 April 2026" style display date. */
export function formatDisplayDate(v: string | null | undefined): string {
  const d = parseIsoDate(v);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The issue date can never be earlier than the completion date. */
export function validateIssueDate(
  issueDate: string | null | undefined,
  completionDate: string | null | undefined
): { ok: boolean; error?: string } {
  const issue = parseIsoDate(issueDate);
  const completion = parseIsoDate(completionDate);
  if (!issue) return { ok: false, error: "Issue date is required." };
  if (completion && issue < completion) {
    return {
      ok: false,
      error: "The issue date cannot be earlier than the completion date.",
    };
  }
  return { ok: true };
}

/** Safe hyphenated file-name fragment: "Mosa Maseko" -> "Mosa-Maseko". */
export function fileNameFragment(v: string): string {
  return String(v ?? "")
    .trim()
    .replace(/[^A-Za-z0-9 /-]+/g, "")
    .replace(/[ /]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function certificateFileName(fullName: string, position: string): string {
  const name = fileNameFragment(fullName) || "Intern";
  const pos = fileNameFragment(position);
  return pos
    ? `${name}-${pos}-Internship-Certificate.pdf`
    : `${name}-Internship-Certificate.pdf`;
}

export function letterFileName(fullName: string): string {
  const name = fileNameFragment(fullName) || "Intern";
  return `${name}-Internship-Recommendation-Letter.pdf`;
}

/** Escape a value before interpolating into template HTML. */
export function esc(v: string | null | undefined): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escaped text with newlines as <br/>. */
export function escMultiline(v: string | null | undefined): string {
  return esc(v).replace(/\r?\n/g, "<br/>");
}
