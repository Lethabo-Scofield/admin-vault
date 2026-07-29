import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  articleFor,
  certificateFileName,
  durationText,
  fileNameFragment,
  letterFileName,
  pronounSet,
  validateIssueDate,
} from "@/lib/documents/fields";
import { certificateHtml } from "@/lib/documents/certificate";
import { letterHtml } from "@/lib/documents/letter";
import type { DocumentData } from "@/lib/documents/data";
import { qrPngBuffer, qrPngDataUrl } from "@/lib/documents/qr";
import { randomBytes } from "crypto";

const base: DocumentData = {
  fullName: "Mosa Maseko",
  position: "AI Engineer",
  department: "Engineering Department",
  programmeTitle: "AI Engineering Internship",
  pronouns: "SHE_HER",
  startDate: "2026-04-20",
  completionDate: "2026-07-20",
  issueDate: "2026-07-20",
  projectsAndResponsibilities: "operational intelligence tooling",
  skillsDemonstrated: "Python, ML",
  founderName: "Dzowa",
  founderTitle: "Founder & CEO",
  founderRecommendation: "An outstanding intern.",
  managerName: "Laura",
  managerTitle: "Department Manager",
  managerRecommendation: "Reliable and curious.",
  credentialCode: "OLX-CERT-2026-0002-Z2yBcQa1hK5S",
  verifyUrl: "https://olyxee.com/verify/OLX-CERT-2026-0002-Z2yBcQa1hK5S",
};

describe("pronouns", () => {
  it("maps each pronoun set correctly", () => {
    expect(pronounSet("SHE_HER")).toEqual({ subject: "she", object: "her", possessive: "her" });
    expect(pronounSet("HE_HIM")).toEqual({ subject: "he", object: "him", possessive: "his" });
    expect(pronounSet("THEY_THEM")).toEqual({ subject: "they", object: "them", possessive: "their" });
  });

  it("falls back to they/them instead of inferring from names", () => {
    expect(pronounSet("")).toEqual({ subject: "they", object: "them", possessive: "their" });
    expect(pronounSet(null)).toEqual(pronounSet("THEY_THEM"));
  });

  it("never mixes pronouns in the letter (she...her, never his)", () => {
    const html = letterHtml({ ...base, pronouns: "SHE_HER" });
    expect(html).toContain("During her internship");
    expect(html).toContain("We wish her continued success in her professional");
    expect(html).not.toMatch(/\bhis\b/);
    expect(html).not.toMatch(/\bhim\b/);
  });

  it("uses he/him/his consistently", () => {
    const html = letterHtml({ ...base, pronouns: "HE_HIM" });
    expect(html).toContain("During his internship");
    expect(html).toContain("We wish him continued success in his professional");
    expect(html).not.toMatch(/wish her\b/);
  });
});

describe("article", () => {
  it("chooses an for vowel-sounding roles", () => {
    expect(articleFor("AI Engineer")).toBe("an");
    expect(articleFor("AI/ML Engineering Intern")).toBe("an");
    expect(articleFor("Engineer")).toBe("an");
  });
  it("chooses a for consonant-sounding roles", () => {
    expect(articleFor("Software Engineer")).toBe("a");
    expect(articleFor("Data Engineering Intern")).toBe("a");
  });
});

describe("duration", () => {
  it("computes months from dates instead of hardcoding three-month", () => {
    expect(durationText("2026-04-20", "2026-07-20")).toBe("a three-month internship");
    expect(durationText("2026-01-01", "2026-07-01")).toBe("a six-month internship");
  });
  it("uses weeks for short internships", () => {
    expect(durationText("2026-06-01", "2026-07-13")).toBe("a six-week internship");
  });
  it("degrades gracefully with missing dates", () => {
    expect(durationText(null, "2026-07-20")).toBe("an internship");
  });
});

describe("issue date validation", () => {
  it("rejects issue dates earlier than completion", () => {
    expect(validateIssueDate("2026-07-19", "2026-07-20").ok).toBe(false);
  });
  it("accepts issue on/after completion", () => {
    expect(validateIssueDate("2026-07-20", "2026-07-20").ok).toBe(true);
    expect(validateIssueDate("2026-08-01", "2026-07-20").ok).toBe(true);
  });
});

describe("credential number format", () => {
  it("matches OLX-CERT-{YEAR}-{NNNN}-{token}", () => {
    const token = randomBytes(9).toString("base64url");
    const code = `OLX-CERT-2026-0002-${token}`;
    expect(code).toMatch(/^OLX-CERT-\d{4}-\d{4}-[A-Za-z0-9_-]{12}$/);
  });
  it("generates distinct secure tokens", () => {
    const a = randomBytes(9).toString("base64url");
    const b = randomBytes(9).toString("base64url");
    expect(a).not.toBe(b);
  });
});

describe("file names", () => {
  it("builds the specified certificate/letter file names", () => {
    expect(certificateFileName("Mosa Maseko", "AI Engineer")).toBe(
      "Mosa-Maseko-AI-Engineer-Internship-Certificate.pdf"
    );
    expect(letterFileName("Mosa Maseko")).toBe(
      "Mosa-Maseko-Internship-Recommendation-Letter.pdf"
    );
  });
  it("strips unsafe characters", () => {
    expect(fileNameFragment('Bob "The Builder" O\'Neil')).toBe("Bob-The-Builder-ONeil");
  });
});

describe("QR code", () => {
  it("decodes exactly to the verification URL", async () => {
    const buf = await qrPngBuffer(base.verifyUrl);
    const png = PNG.sync.read(buf);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(base.verifyUrl);
  });

  it("certificate embeds a freshly generated QR, never the old template image", async () => {
    const qr = await qrPngDataUrl(base.verifyUrl);
    const html = certificateHtml(base, qr);
    expect(html).toContain(qr);
    // All images are embedded data URLs (official brand assets + the freshly
    // generated QR) — never external URLs or images lifted from references.
    const imgSrcs = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
    expect(imgSrcs).toContain(qr);
    for (const src of imgSrcs) expect(src.startsWith("data:image/")).toBe(true);
  });
});

describe("templates", () => {
  it("certificate shows the credential number exactly once and uses the registered company name", () => {
    const html = certificateHtml(base, "data:image/png;base64,x");
    const count = html.split(base.credentialCode).length - 1;
    expect(count).toBe(1);
    expect(html).toContain("Olyxee (Pty) Ltd");
    expect(html).not.toContain("Olyxee (R&D)");
    // Certificate stays short and formal: no projects/skills/recommendations.
    expect(html).not.toContain(base.founderRecommendation);
    expect(html).not.toContain(base.skillsDemonstrated);
  });

  it("letter hides missing recommendation sections", () => {
    const html = letterHtml({ ...base, founderRecommendation: "", managerRecommendation: "" });
    expect(html).not.toContain("Founder&rsquo;s Recommendation");
    expect(html).not.toContain("Manager&rsquo;s Recommendation");
  });

  it("letter handles long names and long recommendations", () => {
    const html = letterHtml({
      ...base,
      fullName: "Alexandrina Wilhelmina van der Westhuizen-Mokoena",
      founderRecommendation: "x".repeat(4000),
    });
    expect(html).toContain("Alexandrina Wilhelmina van der Westhuizen-Mokoena");
    expect(html).toContain("x".repeat(4000));
  });

  it("escapes HTML in user-provided values", () => {
    const html = letterHtml({ ...base, fullName: '<script>alert(1)</script>' });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
