"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { maskSecret } from "@/lib/format";

export default function SecretCell({ secret }: { secret: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <code className="min-w-0 max-w-full flex-1 break-all font-mono text-[12px] leading-relaxed text-gray-600 sm:max-w-[260px]">
        {revealed ? secret : maskSecret(secret)}
      </code>
      <button
        onClick={() => setRevealed((v) => !v)}
        className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label={revealed ? "Hide secret" : "Reveal secret"}
      >
        {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <button
        onClick={copy}
        className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Copy secret"
      >
        {copied ? (
          <Check size={15} className="text-emerald-500" />
        ) : (
          <Copy size={15} />
        )}
      </button>
    </div>
  );
}
