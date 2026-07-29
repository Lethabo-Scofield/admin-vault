import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Eye, Send, Ban, FileText, ScrollText, Download, Trash2 } from "lucide-react";
import { getInternCredential } from "@/lib/intern-queries";
import {
  publishInternCredential,
  revokeInternCredential,
  deleteInternCredential,
} from "@/lib/intern-actions";
import { verificationUrl } from "@/lib/verification";
import { PageHeader } from "@/components/ui";
import InternCredentialForm from "@/components/InternCredentialForm";
import CredentialStatusBadge from "@/components/CredentialStatusBadge";
import ConfirmButton from "@/components/ConfirmButton";
import QrPanel from "@/components/QrPanel";

export const dynamic = "force-dynamic";
// Document rendering uses headless Chromium — allow more than Vercel's 10s default.
export const maxDuration = 60;

export default async function InternCredentialDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const credentialId = Number(id);
  if (!credentialId) notFound();

  const credential = await getInternCredential(credentialId);
  if (!credential) notFound();

  const verifyUrl = verificationUrl(credential);
  let qrPngDataUrl = "";
  let qrSvg = "";
  if (credential.status === "PUBLISHED") {
    // High-resolution PNG with a generous quiet zone for print.
    qrPngDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: "M",
    });
    qrSvg = await QRCode.toString(verifyUrl, {
      type: "svg",
      margin: 4,
      errorCorrectionLevel: "M",
    });
  }

  return (
    <div className="animate-ios-in space-y-8">
      <PageHeader
        title={credential.credentialNumber}
        subtitle={`${credential.internName ?? ""} · ${credential.programmeTitle}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CredentialStatusBadge status={credential.status} />
            <Link
              href={`/credentials/${credential.id}/preview`}
              className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-[14px] font-medium text-gray-800 hover:bg-gray-200"
            >
              <Eye size={16} /> Preview Public Page
            </Link>
            {credential.status === "DRAFT" && (
              <form action={publishInternCredential}>
                <input
                  type="hidden"
                  name="credentialId"
                  value={credential.id}
                />
                <ConfirmButton
                  message="Publish this credential? The verification URL becomes permanent and publicly accessible."
                  className="tap inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-gray-800"
                >
                  <Send size={16} /> Publish
                </ConfirmButton>
              </form>
            )}
            {credential.status === "DRAFT" && (
              <form action={deleteInternCredential}>
                <input
                  type="hidden"
                  name="credentialId"
                  value={credential.id}
                />
                <ConfirmButton
                  message="Permanently delete this draft credential? This cannot be undone."
                  className="tap inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2.5 text-[14px] font-medium text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={16} /> Delete Draft
                </ConfirmButton>
              </form>
            )}
          </div>
        }
      />

      {error && (
        <div className="rounded-ios bg-red-50 px-5 py-4 text-[14px] text-red-700 shadow-ios">
          {error}
        </div>
      )}

      <section className="rounded-ios bg-white p-6 shadow-ios">
        <h3 className="mb-2 text-[16px] font-semibold text-gray-900">
          Documents
        </h3>
        <p className="mb-4 text-[13px] text-gray-500">
          {credential.status === "DRAFT"
            ? "Previews are generated live from the saved draft. Final PDFs are created and stored when the credential is published."
            : "Final PDFs were generated at publication and are regenerated whenever the public information is corrected. The QR code and verification URL never change."}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/credentials/${credential.id}/certificate`}
            target="_blank"
            className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-200"
          >
            <FileText size={15} /> Preview Certificate
          </a>
          <a
            href={`/credentials/${credential.id}/letter`}
            target="_blank"
            className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-200"
          >
            <ScrollText size={15} /> Preview Recommendation Letter
          </a>
          {credential.status === "PUBLISHED" && (
            <>
              <a
                href={`/credentials/${credential.id}/certificate?download=1`}
                className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-200"
              >
                <Download size={15} /> Download Certificate
              </a>
              <a
                href={`/credentials/${credential.id}/letter?download=1`}
                className="tap inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-800 hover:bg-gray-200"
              >
                <Download size={15} /> Download Letter
              </a>
            </>
          )}
        </div>
      </section>

      {credential.status === "PUBLISHED" && (
        <QrPanel
          verifyUrl={verifyUrl}
          qrPngDataUrl={qrPngDataUrl}
          qrSvg={qrSvg}
          credentialNumber={credential.credentialNumber}
        />
      )}

      {credential.status === "REVOKED" && (
        <div className="rounded-ios bg-red-50 px-5 py-4 text-[14px] text-red-700 shadow-ios">
          Revoked on {String(credential.revokedAt).slice(0, 10)}
          {credential.revocationReason
            ? ` — ${credential.revocationReason}`
            : ""}
          . The public page shows only its number and REVOKED status.
        </div>
      )}

      {credential.status === "DRAFT" ? (
        <section>
          <h2 className="mb-3 text-[18px] font-semibold text-gray-900">
            Edit Draft
          </h2>
          <InternCredentialForm credential={credential} />
        </section>
      ) : (
        <section>
          <h2 className="mb-3 text-[18px] font-semibold text-gray-900">
            Correct Public Information
          </h2>
          <p className="mb-3 text-[13px] text-gray-500">
            Edits update the public page; the verification URL never changes.
          </p>
          <InternCredentialForm credential={credential} />
        </section>
      )}

      {credential.status === "PUBLISHED" && (
        <section className="rounded-ios bg-white p-6 shadow-ios">
          <h3 className="mb-2 text-[16px] font-semibold text-gray-900">
            Revoke Credential
          </h3>
          <p className="mb-4 text-[13px] text-gray-500">
            Revoking removes all public details; the page will show REVOKED.
          </p>
          <form
            action={revokeInternCredential}
            className="flex flex-wrap items-center gap-3"
          >
            <input type="hidden" name="credentialId" value={credential.id} />
            <input
              name="reason"
              placeholder="Reason (optional)"
              className="vault-input max-w-sm"
            />
            <ConfirmButton
              message="Revoke this credential? The public verification page will stop showing its details."
              className="tap inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-[14px] font-medium text-white shadow-ios hover:bg-red-700"
            >
              <Ban size={16} /> Revoke
            </ConfirmButton>
          </form>
        </section>
      )}

      <p className="text-[13px] text-gray-400">
        Created by {credential.createdBy || "—"} on{" "}
        {String(credential.createdAt).slice(0, 10)} · Last updated by{" "}
        {credential.updatedBy || "—"} on{" "}
        {String(credential.updatedAt).slice(0, 10)}
      </p>
    </div>
  );
}
