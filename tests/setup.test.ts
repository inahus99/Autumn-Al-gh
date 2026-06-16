import { describe, it, expect } from "vitest";

describe("project setup", () => {
  it("TypeScript types are importable", async () => {
    const { } = await import("../src/types/signal.js");
    const { } = await import("../src/types/config.js");
    const { } = await import("../src/types/prospect.js");
    expect(true).toBe(true);
  });
});
