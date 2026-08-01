import type { DocumentData } from "@/lib/documents/data";
import {
  articleFor,
  durationText,
  esc,
  formatDisplayDate,
} from "@/lib/documents/fields";
import {
  COMPANY_NAME,
  DEFAULT_FOUNDER_NAME,
  DEFAULT_FOUNDER_TITLE,
  DEFAULT_MANAGER_NAME,
  DEFAULT_MANAGER_TITLE,
  logoSvg,
  sealSvg,
  signatureFontCss,
  signatureHtml,
  watermarkSvg,
} from "@/lib/documents/branding";

/**
 * A4 landscape certificate, recreated from the master reference as an
 * editable HTML/CSS template. Fully deterministic: templates + DB values only.
 */
export function certificateHtml(d: DocumentData, qrDataUrl: string): string {
  const article = articleFor(d.position);
  const duration = durationText(d.startDate, d.completionDate);
  const start = formatDisplayDate(d.startDate);
  const end = formatDisplayDate(d.completionDate);
  const issued = formatDisplayDate(d.issueDate);

  // Signatures always appear, exactly as on the master reference:
  // handwritten name above the line, title + company below it.
  const founderName = d.founderName || DEFAULT_FOUNDER_NAME;
  const founderTitle = d.founderTitle || DEFAULT_FOUNDER_TITLE;
  const managerName = d.managerName || DEFAULT_MANAGER_NAME;
  const managerTitle = d.managerTitle || DEFAULT_MANAGER_TITLE;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Certificate — ${esc(d.fullName)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 297mm; height: 210mm; }
  body {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #232a33; background: #ffffff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet {
    position: relative; width: 297mm; height: 210mm; padding: 9mm;
    display: flex; flex-direction: column;
  }
  .frame {
    position: relative; flex: 1; border: 1.2px solid #2b3440;
    border-radius: 10px; padding: 12mm 14mm 9mm; overflow: hidden;
    display: flex; flex-direction: column;
  }
  .watermark {
    position: absolute; inset: 0; display: flex;
    align-items: center; justify-content: center; pointer-events: none;
  }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand .name { font-size: 17px; font-weight: 600; color: #3f4750; }
  .brand .word { font-size: 21px; font-weight: 800; letter-spacing: 1px; color: #1c232c; }
  .tagline { font-size: 12.5px; color: #4a545f; padding-top: 6px; }
  .body { position: relative; flex: 1; padding-top: 14mm; max-width: 175mm; }
  .certify { font-size: 16px; color: #38414c; }
  .fullname { font-size: 34px; font-weight: 800; margin: 7mm 0; color: #10161d; }
  .statement { font-size: 16.5px; line-height: 1.65; color: #232a33; }
  .statement b { font-weight: 700; }
  .issued { font-size: 16px; margin-top: 12mm; }
  ${signatureFontCss()}
  .signatures {
    position: absolute; top: 32mm; right: 14mm; width: 50mm; text-align: center;
  }
  .sig-block { margin-bottom: 16mm; }
  .sig-line { border-top: 1px solid #6b7480; margin-top: 1px; padding-top: 4px; }
  .sig-title { font-size: 11.5px; color: #4a545f; line-height: 1.5; }
  .bottom { display: flex; justify-content: space-between; align-items: flex-end; }
  .credinfo { font-size: 11.5px; color: #3c4550; line-height: 1.7; }
  .credinfo b { color: #1c232c; }
  .verify-blocks { display: flex; align-items: flex-end; gap: 8mm; }
  .qr { width: 26mm; height: 26mm; background: #fff; padding: 1mm; border: 1px solid #e3e6ea; }
  .qr img { width: 100%; height: 100%; display: block; }
  .footer {
    text-align: center; font-size: 8.5px; letter-spacing: 2px; color: #8a929c;
    text-transform: uppercase; padding-top: 3mm;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="frame">
      <div class="watermark">${watermarkSvg(420)}</div>
      <div class="top">
        <div class="brand">
          ${logoSvg(46)}
          <div>
            <div class="name">Olyxee</div>
            <div class="word">CERTIFICATE</div>
          </div>
        </div>
        <div class="tagline">Research and Infrastructure for Operational Intelligence</div>
      </div>

      <div class="body">
        <div class="certify">This is to certify that</div>
        <div class="fullname">${esc(d.fullName)}</div>
        <div class="statement">
          successfully completed <b>${esc(duration)}</b> as ${article}
          <b>${esc(d.position)}</b><br/>
          within the <b>${esc(d.department)}</b> at <b>${COMPANY_NAME}</b>,<br/>
          from <b>${esc(start)}</b> to <b>${esc(end)}</b>.
        </div>
        <div class="issued">Issued on <b>${esc(issued)}</b> in Johannesburg, South Africa.</div>
      </div>

      <div class="signatures">
        <div class="sig-block">
          ${signatureHtml(founderName)}
          <div class="sig-line">
            <div class="sig-title">${esc(founderTitle)}<br/>${COMPANY_NAME}</div>
          </div>
        </div>
        <div class="sig-block">
          ${signatureHtml(managerName)}
          <div class="sig-line">
            <div class="sig-title">${esc(managerTitle)}<br/>${COMPANY_NAME}</div>
          </div>
        </div>
      </div>

      <div class="bottom">
        <div class="credinfo">
          <div><b>Certificate Number:</b> ${esc(d.credentialCode)}</div>
          <div><b>Verify:</b> scan the QR code or visit olyxee.com/verify</div>
        </div>
        <div class="verify-blocks">
          <div class="qr"><img src="${qrDataUrl}" alt="Verification QR code"/></div>
          ${sealSvg(84)}
        </div>
      </div>
    </div>
    <div class="footer">
      Certificate of Internship Completion · ${COMPANY_NAME} · Johannesburg, South Africa · Verify via QR
    </div>
  </div>
</body>
</html>`;
}
