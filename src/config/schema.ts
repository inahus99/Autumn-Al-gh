import { z } from "zod";

const IcpSchema = z.object({
  min_repo_count: z
    .number()
    .int()
    .min(0)
    .default(1)
    .describe("Minimum public repos an org must have to be surfaced"),
  max_repo_count: z
    .number()
    .int()
    .min(1)
    .default(200)
    .describe("Maximum public repos — filters out very large orgs"),
  languages: z
    .array(z.string().min(1))
    .default([])
    .describe("Primary languages to match (empty = all languages)"),
  exclude_orgs: z
    .array(z.string().min(1))
    .default([])
    .describe("Org logins to permanently skip"),
});

const NewOrgSignalSchema = z.object({
  enabled: z.boolean().default(true),
  created_within_days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .default(14)
    .describe("Surface orgs created within this many days"),
});

const HiringSurgeSignalSchema = z.object({
  enabled: z.boolean().default(true),
  min_new_members: z
    .number()
    .int()
    .min(1)
    .default(2)
    .describe("Minimum new members added to trigger the signal"),
  window_days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .default(30)
    .describe("Lookback window for counting new members"),
});

const TechPivotSignalSchema = z.object({
  enabled: z.boolean().default(true),
  languages: z
    .array(z.string().min(1))
    .min(1, "tech_pivot.languages must have at least one entry when enabled")
    .default(["TypeScript", "Rust", "Go"]),
});

const RepoMomentumSignalSchema = z.object({
  enabled: z.boolean().default(true),
  min_stars_per_day: z
    .number()
    .min(0.1)
    .default(5)
    .describe("Minimum star velocity (stars/day) to trigger the signal"),
});

const CompetitorMentionSignalSchema = z.object({
  enabled: z.boolean().default(false),
  competitors: z
    .array(z.string().min(1))
    .default([])
    .describe("Strings to search for in code and README files"),
});

const SignalsSchema = z
  .object({
    new_org: NewOrgSignalSchema.default({}),
    hiring_surge: HiringSurgeSignalSchema.default({}),
    tech_pivot: TechPivotSignalSchema.default({}),
    repo_momentum: RepoMomentumSignalSchema.default({}),
    competitor_mention: CompetitorMentionSignalSchema.default({}),
  })
  .refine(
    (s) =>
      s.new_org.enabled ||
      s.hiring_surge.enabled ||
      s.tech_pivot.enabled ||
      s.repo_momentum.enabled ||
      s.competitor_mention.enabled,
    { message: "At least one signal type must be enabled" }
  );

const SlackOutputSchema = z.object({
  webhook_url: z
    .string()
    .url("slack.webhook_url must be a valid URL")
    .startsWith("https://hooks.slack.com/", "slack.webhook_url must be a Slack webhook URL"),
});

const HubSpotOutputSchema = z.object({
  api_key: z
    .string()
    .min(10, "hubspot.api_key looks too short — check your private app token"),
});

const CsvOutputSchema = z.object({
  path: z.string().min(1).default("./signals.csv"),
  format: z.enum(["apollo", "instantly", "generic"]).default("apollo"),
});

const OutputsSchema = z
  .object({
    slack: SlackOutputSchema.optional(),
    hubspot: HubSpotOutputSchema.optional(),
    csv: CsvOutputSchema.optional(),
  })
  .refine((o) => o.slack ?? o.hubspot ?? o.csv, {
    message: "At least one output (slack, hubspot, or csv) must be configured",
  });

export const GhSignalConfigSchema = z.object({
  icp: IcpSchema.default({}),
  signals: SignalsSchema.default({}),
  outputs: OutputsSchema,
  poll_interval_minutes: z
    .number()
    .min(5, "poll_interval_minutes must be at least 5 to stay within GitHub rate limits")
    .default(60),
  dedup_window_days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(14)
    .describe("Suppress re-surfacing the same org+signal within this window"),
});

export type ValidatedConfig = z.infer<typeof GhSignalConfigSchema>;
