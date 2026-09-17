import { describe, expect, it } from "vitest";
import { normalizeList, parseListItems } from "../lib/list-items";

describe("pasted list formatting", () => {
  it("accepts bullets, numbered items, commas, semicolons, and new lines", () => {
    expect(
      parseListItems("• React\n2. TypeScript, API design; - Testing")
    ).toEqual(["React", "TypeScript", "API design", "Testing"]);
  });

  it("removes duplicate and empty items", () => {
    expect(normalizeList("Communication\n\nCommunication, Leadership")).toBe(
      "Communication\nLeadership"
    );
  });
});