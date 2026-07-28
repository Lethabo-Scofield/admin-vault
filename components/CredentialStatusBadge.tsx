const STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  REVOKED: "bg-red-50 text-red-600",
  EXPIRED: "bg-amber-50 text-amber-700",
};

export default function CredentialStatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
