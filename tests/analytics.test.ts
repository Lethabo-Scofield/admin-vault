import { describe, it, expect, beforeAll } from "vitest";
import { encryptString, decryptString } from "@/lib/crypto";
import {
  humanizeAction,
  assertPostgresUrl,
  assertAllowedAnalyticsHost,
  describeDbError,
} from "@/lib/analytics";
import { timeAgo, activityBucket } from "@/lib/format";

beforeAll(() => {
  process.env.SESSION_SECRET ||= "test-secret-for-vitest";
});

describe("crypto", () => {
  it("round-trips a connection string", () => {
    const url = "postgresql://user:p%40ss@db.example.com:6543/postgres";
    const enc = encryptString(url);
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(enc).not.toContain("p%40ss");
    expect(decryptString(enc)).toBe(url);
  });

  it("rejects tampered ciphertext", () => {
    const enc = encryptString("postgresql://a:b@c/d");
    const tampered = enc.slice(0, -2) + (enc.endsWith("A=") ? "B=" : "A=");
    expect(() => decryptString(tampered)).toThrow();
  });
});

describe("analytics helpers", () => {
  it("humanizes audit actions", () => {
    expect(humanizeAction("UPDATE_ORDER_STATUS")).toBe("Updated order status");
    expect(humanizeAction("CREATE_INVOICE")).toBe("Created invoice");
    expect(humanizeAction("SET_SUPPLIER_TRACKING_NUMBER")).toBe(
      "Set supplier tracking number"
    );
  });

  it("validates postgres URLs", () => {
    expect(() => assertPostgresUrl("postgresql://u:p@h:5432/db")).not.toThrow();
    expect(() => assertPostgresUrl("mysql://u:p@h/db")).toThrow();
    expect(() => assertPostgresUrl("not a url")).toThrow();
  });

  it("blocks private and local hosts", () => {
    for (const h of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.0.1", "169.254.1.1", "helium", "db.internal", "[::1]"]) {
      expect(() => assertAllowedAnalyticsHost(`postgresql://u:p@${h}:5432/db`), h).toThrow();
    }
    expect(() => assertAllowedAnalyticsHost("postgresql://u:p@aws-1-eu-west-2.pooler.supabase.com:6543/postgres")).not.toThrow();
    expect(() => assertAllowedAnalyticsHost("postgresql://u:p@172.32.0.1:5432/db")).not.toThrow();
  });

  it("describes database errors without leaking credentials", () => {
    expect(describeDbError(new Error("Tenant or user not found"))).toMatch(/paused|deleted/);
    expect(describeDbError(Object.assign(new Error("x"), { code: "28P01" }))).toBe("Password authentication failed.");
    expect(describeDbError(new Error("getaddrinfo ENOTFOUND db.invalid"))).toBe("Host not found.");
    const leaky = describeDbError(new Error("failed for postgresql://user:secret@host/db"));
    expect(leaky).not.toContain("secret");
  });

  it("formats relative time and buckets", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    expect(timeAgo(null, now)).toBe("never");
    expect(timeAgo("2026-09-06T11:59:50Z", now)).toBe("just now");
    expect(timeAgo("2026-09-06T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-09-01T12:00:00Z", now)).toBe("5 days ago");
    expect(activityBucket("2026-09-06T01:00:00Z", now)).toBe("active");
    expect(activityBucket("2026-09-02T00:00:00Z", now)).toBe("recent");
    expect(activityBucket("2026-08-20T00:00:00Z", now)).toBe("idle");
    expect(activityBucket("2026-01-01T00:00:00Z", now)).toBe("inactive");
  });
});
