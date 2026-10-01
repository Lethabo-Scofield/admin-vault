import { describe, expect, it } from "vitest";
import { credentialCategory, credentialTypeLabel } from "../lib/credential-categories";

describe("key types", () => {
  it("uses the entered type instead of guessing from the service name", () => {
    expect(credentialCategory("Database", "Stripe")).toBe("database");
    expect(credentialCategory("API", "Postgres")).toBe("services");
    expect(credentialCategory("Authentication", "Custom key")).toBe("security");
  });

  it("preserves custom types and groups them under Other", () => {
    expect(credentialCategory("Payments", "Stripe")).toBe("other");
    expect(credentialTypeLabel(" Payments ", "Stripe")).toBe("Payments");
  });

  it("keeps existing keys categorized when they have no explicit type", () => {
    expect(credentialCategory("", "Postgres connection")).toBe("database");
    expect(credentialTypeLabel("", "Postgres connection")).toBe("Database");
  });
});