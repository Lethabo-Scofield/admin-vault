import type { InternCredential } from "@/lib/types";

export const PUBLIC_VERIFY_BASE = "https://olyxee.com/verify";

/** Permanent public verification URL: never changes after publication. */
export function verificationUrl(credential: InternCredential): string {
  return `${PUBLIC_VERIFY_BASE}/${credential.credentialNumber}-${credential.verificationToken}`;
}
