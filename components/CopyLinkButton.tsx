"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export default function CopyLinkButton({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard unavailable; nothing to do.
        }
      }}
    >
      {copied ? <Check size={15} /> : <Link2 size={15} />}
      {copied ? "Copied" : "Copy verification link"}
    </button>
  );
}
