import type { GhSignalConfig } from "./src/types/config.js";

const config: GhSignalConfig = {
  icp: {
    // Only surface orgs with at least this many public repos
    min_repo_count: 2,
    // Skip very large orgs (likely enterprises, not SMBs)
    max_repo_count: 80,
    // Only surface orgs whose primary language matches one of these
    languages: ["TypeScript", "Go", "Rust", "Python"],
    // Orgs to permanently ignore (big tech, known non-prospects)
    exclude_orgs: ["microsoft", "google", "aws", "facebook", "apple"],
  },

  signals: {
    new_org: {
      enabled: true,
      // Surface orgs created within the last N days
      created_within_days: 14,
    },
    hiring_surge: {
      enabled: true,
      // Fire if an org added at least this many new members
      min_new_members: 2,
      // ...within this many days
      window_days: 30,
    },
    tech_pivot: {
      enabled: true,
      // Fire when an org's repos start heavily using one of these languages
      languages: ["Rust", "Go", "TypeScript"],
    },
    repo_momentum: {
      enabled: true,
      // Fire if any single repo gains at least this many stars per day
      min_stars_per_day: 10,
    },
    competitor_mention: {
      enabled: true,
      // Search for mentions of these strings in code and README files
      // Customize to your competitors or the tools your prospects use
      competitors: ["linear", "jira", "asana", "notion", "salesforce"],
    },
  },

  outputs: {
    slack: {
      webhook_url: process.env.SLACK_WEBHOOK_URL ?? "",
    },
    hubspot: {
      api_key: process.env.HUBSPOT_API_KEY ?? "",
    },
    csv: {
      path: "./signals.csv",
      // "apollo" | "instantly" | "generic"
      format: "apollo",
    },
  },

  // How often to poll GitHub in watch mode (minutes)
  poll_interval_minutes: 60,

  // Don't re-surface the same org + signal type within this window
  dedup_window_days: 14,
};

export default config;
