import { createRequire } from "module";
import { resolve, isAbsolute } from "path";
import { existsSync } from "fs";
import { config as loadDotenv } from "dotenv";
import { ZodError } from "zod";
import { GhSignalConfigSchema, type ValidatedConfig } from "./schema.js";

loadDotenv();

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function formatZodError(err: ZodError): string {
  const lines = err.errors.map((e) => {
    const path = e.path.length > 0 ? e.path.join(".") : "config";
    return `  • ${path}: ${e.message}`;
  });
  return `Config validation failed:\n${lines.join("\n")}`;
}

export async function loadConfig(configPath: string): Promise<ValidatedConfig> {
  const absPath = isAbsolute(configPath)
    ? configPath
    : resolve(process.cwd(), configPath);

  if (!existsSync(absPath)) {
    throw new ConfigError(
      `Config file not found: ${absPath}\n` +
        `  Copy the example to get started:\n` +
        `  cp gh-signal.config.example.ts gh-signal.config.ts`
    );
  }

  let raw: unknown;
  try {
    // Dynamic import works for both .ts (via tsx) and compiled .js
    const mod = await import(absPath) as { default?: unknown };
    raw = mod.default ?? mod;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConfigError(`Failed to load config file: ${absPath}\n  ${msg}`);
  }

  const result = GhSignalConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError(formatZodError(result.error));
  }

  // Substitute env vars for secrets left as empty strings
  const cfg = result.data;

  if (cfg.outputs.slack && !cfg.outputs.slack.webhook_url) {
    const fromEnv = process.env.SLACK_WEBHOOK_URL;
    if (!fromEnv) {
      throw new ConfigError(
        "outputs.slack is configured but SLACK_WEBHOOK_URL is not set in .env"
      );
    }
    cfg.outputs.slack.webhook_url = fromEnv;
  }

  if (cfg.outputs.hubspot && !cfg.outputs.hubspot.api_key) {
    const fromEnv = process.env.HUBSPOT_API_KEY;
    if (!fromEnv) {
      throw new ConfigError(
        "outputs.hubspot is configured but HUBSPOT_API_KEY is not set in .env"
      );
    }
    cfg.outputs.hubspot.api_key = fromEnv;
  }

  return cfg;
}

// Re-export the type so callers don't need to import from two places
export type { ValidatedConfig };

// Satisfy the unused import — createRequire is available if needed for CJS interop
const _r = createRequire;
void _r;
