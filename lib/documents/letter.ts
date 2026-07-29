import type { DocumentData } from "@/lib/documents/data";
import {
  articleFor,
  esc,
  escMultiline,
  formatDisplayDate,
  pronounSet,
} from "@/lib/documents/fields";
import {
  COMPANY_ADDRESS_LINES,
  COMPANY_CONTACT_LINES,
  COMPANY_NAME,
  COMPANY_REGISTRATION,
  DEFAULT_FOUNDER_NAME,
  DEFAULT_FOUNDER_TITLE,
  DEFAULT_MANAGER_NAME,
  DEFAULT_MANAGER_TITLE,
  logoSvg,
  signatureFontCss,
  signatureHtml,
} from "@/lib/documents/branding";

/**
 * A4 portrait recommendation letter, recreated from the reference letter as an
 * editable HTML/CSS template. Deterministic: templates + DB values only.
 * Recommendation sections without content are hidden entirely.
 */
export function letterHtml(d: DocumentData): string {
  const p = pronounSet(d.pronouns);
  const article = articleFor(d.position);
  const issued = formatDisplayDate(d.issueDate);
  const start = formatDisplayDate(d.startDate);
  const end = formatDisplayDate(d.completionDate);

  const projects = String(d.projectsAndResponsibilities ?? "").trim();
  const founderRec = String(d.founderRecommendation ?? "").trim();
  const managerRec = String(d.managerRecommendation ?? "").trim();

  const contributionSentence = projects
    ? `<p>During ${p.possessive} internship, ${esc(d.fullName)} contributed to ${escMultiline(projects)}.</p>`
    : "";

  const founderSection = founderRec
    ? `<h3>Founder&rsquo;s Recommendation</h3><p>${escMultiline(founderRec)}</p>`
    : "";
  const managerSection = managerRec
    ? `<h3>Manager&rsquo;s Recommendation</h3><p>${escMultiline(managerRec)}</p>`
    : "";

  // Signatures always appear, matching the reference: handwritten name above
  // the line, title + company below it.
  const founderName = d.founderName || DEFAULT_FOUNDER_NAME;
  const founderTitle = d.founderTitle || DEFAULT_FOUNDER_TITLE;
  const managerName = d.managerName || DEFAULT_MANAGER_NAME;
  const managerTitle = d.managerTitle || DEFAULT_MANAGER_TITLE;
  const signatures = [
    `<div class="sig">
      ${signatureHtml(founderName)}
      <div class="sig-name">${esc(founderTitle)}</div>
      <div class="sig-title">${COMPANY_NAME}</div>
    </div>`,
    `<div class="sig">
      ${signatureHtml(managerName)}
      <div class="sig-name">${esc(managerTitle)}</div>
      <div class="sig-title">${COMPANY_NAME}</div>
    </div>`,
  ];

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Recommendation Letter — ${esc(d.fullName)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; }
  body {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #232a33; background: #ffffff; font-size: 13.5px; line-height: 1.7;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet {
    width: 210mm; min-height: 297mm; padding: 18mm 20mm 14mm;
    display: flex; flex-direction: column;
  }
  .letterhead { display: flex; justify-content: space-between; }
  .letterhead .left, .letterhead .right { font-size: 12.5px; color: #38414c; }
  .letterhead .right { text-align: right; }
  .letterhead a { color: #1670c6; text-decoration: none; }
  .brand { display: flex; align-items: center; gap: 8px; margin-top: 6mm; }
  .brand span { font-size: 17px; font-weight: 700; color: #3f4750; }
  .issue-date { margin-top: 8mm; font-size: 13px; color: #38414c; }
  .heading {
    text-align: center; font-weight: 700; text-decoration: underline;
    letter-spacing: 0.5px; margin: 12mm 0 10mm; font-size: 14.5px; color: #10161d;
  }
  .body-copy p { margin-bottom: 5mm; }
  .body-copy b { font-weight: 700; }
  .body-copy h3 { font-size: 13.5px; margin: 6mm 0 2mm; color: #10161d; }
  .closing { margin-top: 8mm; }
  .sig-row { display: flex; gap: 24mm; margin-top: 10mm; flex-wrap: wrap; }
  .sig { min-width: 55mm; }
  ${signatureFontCss()}
  .sig-name { font-weight: 600; border-top: 1px solid #6b7480; padding-top: 3px; font-size: 12.5px; }
  .sig-title { font-size: 12px; color: #5a6470; }
  .spacer { flex: 1; }
  .reg { font-size: 11px; color: #5a6470; margin-top: 12mm; }
  .verify-footer {
    margin-top: 3mm; padding-top: 3mm; border-top: 1px solid #e3e6ea;
    font-size: 10.5px; color: #7a828c;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="letterhead">
      <div class="left">${COMPANY_ADDRESS_LINES.map(esc).join("<br/>")}</div>
      <div class="right">${COMPANY_CONTACT_LINES.map((l) =>
        l.startsWith("http") ? `<a href="${esc(l)}">${esc(l)}</a>` : esc(l)
      ).join("<br/>")}</div>
    </div>
    <div class="brand">${logoSvg(30)}<span>Olyxee</span></div>
    <div class="issue-date">${esc(issued)}</div>

    <div class="heading">TO WHOM IT MAY CONCERN</div>

    <div class="body-copy">
      <p>
        This letter confirms that <b>${esc(d.fullName)}</b> successfully completed the
        Olyxee <b>${esc(d.programmeTitle)}</b> as ${article} <b>${esc(d.position)}</b>
        from <b>${esc(start)}</b> to <b>${esc(end)}</b>.
      </p>
      ${contributionSentence}
      ${founderSection}
      ${managerSection}
      <p>
        We wish ${p.object} continued success in ${p.possessive} professional
        development and future endeavours.
      </p>
    </div>

    <div class="closing">
      Yours sincerely,<br/>
      <b>For ${COMPANY_NAME}</b>
    </div>

    <div class="sig-row">${signatures.join("")}</div>

    <div class="spacer"></div>
    <div class="reg">${esc(COMPANY_REGISTRATION)}</div>
    <div class="verify-footer">
      Credential ${esc(d.credentialCode)} · Verify at ${esc(d.verifyUrl)}
    </div>
  </div>
</body>
</html>`;
}
