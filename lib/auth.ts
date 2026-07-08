// Edge-safe auth helpers (no next/headers import — usable from middleware).
// Uses Web Crypto (crypto.subtle) so it runs in both the Edge and Node runtimes.

export const SESSION_COOKIE = "vault_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "admin@olyxee.com").toLowerCase();
}

export function getAdminRole(): string {
  return process.env.ADMIN_ROLE || "Administrator";
}

function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function hasSigningSecret(): boolean {
  return Boolean(getSecret());
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str: string): Uint8Array {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

// Demo login (demo / demo) is only available outside production so the UI
// can be previewed without configuring ADMIN_PASSWORD.
export function isDemoLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isDemoCredentials(email: string, password: string): boolean {
  return (
    isDemoLoginEnabled() &&
    email.trim().toLowerCase() === "demo" &&
    password === "demo"
  );
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<boolean> {
  if (isDemoCredentials(email, password)) return true;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const emailOk = email.trim().toLowerCase() === getAdminEmail();
  const passOk = timingSafeEqual(password, adminPassword);
  return emailOk && passOk;
}

export async function createSessionToken(email: string): Promise<string> {
  if (!getSecret()) {
    throw new Error(
      "Session signing secret is not configured. Set SESSION_SECRET or ADMIN_PASSWORD."
    );
  }
  const payload = { sub: email, exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const payloadB64 = b64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const sig = await sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ email: string } | null> {
  if (!token) return null;
  // Never accept a token when no signing secret is configured: an empty key is
  // publicly known and would make forged cookies verifiable.
  if (!getSecret()) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = await sign(payloadB64);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payloadB64))
    );
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return { email: String(payload.sub ?? getAdminEmail()) };
  } catch {
    return null;
  }
}
