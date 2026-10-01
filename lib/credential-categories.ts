export type CredentialCategory = "all" | "database" | "services" | "security" | "other";

const LABELS = {
  database: "Database",
  services: "API / Service",
  security: "Auth / Security",
  other: "Other",
};

export function credentialCategory(keyType: string, serviceName: string): Exclude<CredentialCategory, "all"> {
  // Explicit types take precedence; older keys retain their inferred category.
  const name = (keyType.trim() || serviceName).toLowerCase();
  if (/(database|\bdb\b|postgres|mysql|mariadb|mongo|redis|supabase|neon|planetscale|cockroach|sqlite|dynamo|firestore)/.test(name)) {
    return "database";
  }
  if (/(auth|oauth|jwt|session|clerk|auth0|captcha|turnstile|encryption|signing|security)/.test(name)) {
    return "security";
  }
  if (/(api|service|webhook|stripe|paypal|sendgrid|mailgun|twilio|openai|anthropic|aws|azure|google|github|gitlab|vercel|netlify|cloudflare|slack|notion|shopify)/.test(name)) {
    return "services";
  }
  return "other";
}

export function credentialTypeLabel(keyType: string, serviceName: string): string {
  return keyType.trim() || LABELS[credentialCategory("", serviceName)];
}