"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Download,
  Printer,
} from "lucide-react";
import { logQrDownload } from "@/lib/intern-actions";

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export default function QrPanel({
  verifyUrl,
  qrPngDataUrl,
  qrSvg,
  credentialNumber,
}: {
  verifyUrl: string;
  qrPngDataUrl: string;
  qrSvg: string;
  credentialNumber: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function logDownload(format: string) {
    const fd = new FormData();
    fd.set("credentialNumber", credentialNumber);
    fd.set("format", format);
    void logQrDownload(fd);
  }

  function downloadSvg() {
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `${credentialNumber}-qr.svg`);
    URL.revokeObjectURL(url);
    logDownload("svg");
  }

  function printQr() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${credentialNumber}</title></head>
       <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif">
       <img src="${qrPngDataUrl}" style="width:110mm;height:110mm" />
       <p style="margin-top:8mm;font-size:12pt">${credentialNumber}</p>
       </body></html>`
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  const btn =
    "tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-200";

  return (
    <div className="rounded-ios bg-white p-6 shadow-ios">
      <h3 className="mb-4 text-[16px] font-semibold text-gray-900">
        Verification & QR Code
      </h3>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="shrink-0 rounded-2xl border border-gray-200 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrPngDataUrl}
            alt={`QR code for ${credentialNumber}`}
            className="h-44 w-44"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-gray-400">
            Permanent verification URL
          </p>
          <p className="mb-4 break-all rounded-xl bg-gray-50 px-3 py-2 font-mono text-[13px] text-gray-800">
            {verifyUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyUrl} className={btn}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy URL"}
            </button>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={btn}
            >
              <ExternalLink size={15} />
              Open Public Page
            </a>
            <button
              onClick={() => {
                downloadDataUrl(qrPngDataUrl, `${credentialNumber}-qr.png`);
                logDownload("png");
              }}
              className={btn}
            >
              <Download size={15} />
              PNG
            </button>
            <button onClick={downloadSvg} className={btn}>
              <Download size={15} />
              SVG
            </button>
            <button onClick={printQr} className={btn}>
              <Printer size={15} />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
