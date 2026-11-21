"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" onClick={async () => { await navigator.clipboard.writeText(email); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }} className="inline-flex items-center gap-2 truncate text-left text-[14px] text-gray-700 hover:text-gray-950" title="Copy email">{email}{copied ? <Check size={15} className="shrink-0 text-gray-500" /> : <Copy size={15} className="shrink-0 text-gray-400" />}</button>;
}
