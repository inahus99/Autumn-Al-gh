import { describe, it, expect } from "vitest";
import { GhSignalConfigSchema } from "../src/config/schema.js";

describe("GhSignalConfigSchema", () => {
  const minimalValid = {
    outputs: {
      csv: { path: "./signals.csv", format: "apollo" as const },
    },
  };

  it("accepts a minimal config with only csv output", () => {
    const result = GhSignalConfigSchema.safeParse(minimalValid);
    expect(result.success).toBe(true);
  });

  it("applies defaults for icp, signals, poll interval, and dedup window", () => {
    const result = GhSignalConfigSchema.safeParse(minimalValid);
    if (!result.success) throw new Error(result.error.message);

    expect(result.data.icp.min_repo_count).toBe(1);
    expect(result.data.icp.languages).toEqual([]);
    expect(result.data.poll_interval_minutes).toBe(60);
    expect(result.data.dedup_window_days).toBe(14);
    expect(result.data.signals.new_org.enabled).toBe(true);
  });

  it("rejects poll_interval_minutes below 5", () => {
    const result = GhSignalConfigSchema.safeParse({
      ...minimalValid,
      poll_interval_minutes: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toMatch(/at least 5/);
    }
  });

  it("rejects config where all signals are disabled", () => {
    const result = GhSignalConfigSchema.safeParse({
      ...minimalValid,
      signals: {
        new_org: { enabled: false },
        hiring_surge: { enabled: false },
        tech_pivot: { enabled: false, languages: ["Go"] },
        repo_momentum: { enabled: false },
        competitor_mention: { enabled: false },
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toMatch(/At least one signal/);
    }
  });

  it("rejects config with no outputs configured", () => {
    const result = GhSignalConfigSchema.safeParse({ outputs: {} });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.message.match(/At least one output/))).toBe(true);
    }
  });

  it("rejects invalid Slack webhook URL", () => {
    const result = GhSignalConfigSchema.safeParse({
      outputs: {
        slack: { webhook_url: "https://example.com/not-a-slack-hook" },
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.errors[0].message;
      expect(msg).toMatch(/Slack webhook/);
    }
  });

  it("accepts full valid config", () => {
    const result = GhSignalConfigSchema.safeParse({
      icp: {
        min_repo_count: 3,
        max_repo_count: 50,
        languages: ["TypeScript", "Go"],
        exclude_orgs: ["microsoft"],
      },
      signals: {
        new_org: { enabled: true, created_within_days: 7 },
        hiring_surge: { enabled: true, min_new_members: 3, window_days: 14 },
        tech_pivot: { enabled: true, languages: ["Rust"] },
        repo_momentum: { enabled: false, min_stars_per_day: 10 },
        competitor_mention: { enabled: true, competitors: ["linear"] },
      },
      outputs: {
        csv: { path: "./out.csv", format: "instantly" },
      },
      poll_interval_minutes: 30,
      dedup_window_days: 7,
    });
    expect(result.success).toBe(true);
  });
});
