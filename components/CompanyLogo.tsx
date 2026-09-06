"use client";

import { useState } from "react";
import { initials, accentColor } from "@/lib/format";

/**
 * Company icon for a customer business. Uses the business's own logo when it
 * has one, otherwise the favicon of its website domain; falls back to
 * coloured initials if neither loads.
 */
export default function CompanyLogo({
  name,
  domain,
  logoUrl,
  size = 40,
  className = "",
}: {
  name: string;
  domain: string | null;
  logoUrl: string | null;
  size?: number;
  className?: string;
}) {
  const candidates = [
    logoUrl,
    // Large icon first; some sites only publish a small favicon, so fall back
    // to smaller sizes and a second provider before giving up.
    domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null,
    domain ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico` : null,
    domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : null,
  ].filter((u): u is string => Boolean(u));
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];
  const radius = size >= 40 ? "rounded-xl" : "rounded-lg";

  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center ${radius} font-semibold text-white ${className}`}
        style={{ width: size, height: size, backgroundColor: accentColor(name), fontSize: size * 0.34 }}
        aria-label={name}
      >
        {initials(name)}
      </div>
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${radius} bg-white ring-1 ring-black/[0.06] ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="h-[70%] w-[70%] object-contain"
        onError={() => setIdx((i) => i + 1)}
      />
    </div>
  );
}
