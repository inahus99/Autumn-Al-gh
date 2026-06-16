#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, "../../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

const program = new Command();

program
  .name("gh-signal")
  .description("GitHub buying signal monitor for B2B sales teams")
  .version(getVersion());

program
  .command("watch")
  .description("Run signal detection continuously on a polling interval")
  .option("-c, --config <path>", "Path to config file", "gh-signal.config.ts")
  .option("--dry-run", "Detect signals but skip all outputs (Slack, HubSpot, CSV)")
  .action(async (opts: { config: string; dryRun?: boolean }) => {
    const { runWatch } = await import("./watch.js");
    await runWatch(opts);
  });

program
  .command("run")
  .description("Run signal detection once and exit")
  .option("-c, --config <path>", "Path to config file", "gh-signal.config.ts")
  .option("--dry-run", "Detect signals but skip all outputs")
  .action(async (opts: { config: string; dryRun?: boolean }) => {
    const { runOnce } = await import("./run.js");
    await runOnce(opts);
  });

program
  .command("signals")
  .description("View and export previously detected signals")
  .option("-c, --config <path>", "Path to config file", "gh-signal.config.ts")
  .option("--format <fmt>", "Export format: apollo | instantly | json", "json")
  .option("--output <path>", "Output file path (defaults to stdout)")
  .option("--limit <n>", "Max number of signals to show", "50")
  .action(async (opts: { config: string; format: string; output?: string; limit: string }) => {
    const { runSignals } = await import("./signals.js");
    await runSignals(opts);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nError: ${message}`);
  process.exit(1);
});
