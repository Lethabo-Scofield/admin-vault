import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Symmetric encryption for sensitive per-row values (e.g. a project's analytics
 * database URL). Key is derived from SESSION_SECRET so no extra configuration
 * is needed; rotating SESSION_SECRET therefore invalidates stored URLs.
 */
function key(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
  if (!secret) {
    throw new Error("SESSION_SECRET is required to encrypt stored connection strings.");
  }
  return createHash("sha256").update(secret).digest();
}

const PREFIX = "enc:v1:";

export function encryptString(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, data]).toString("base64");
}

export function decryptString(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    throw new Error("Stored value is not in the expected encrypted format.");
  }
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
