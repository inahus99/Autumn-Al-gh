import chalk from "chalk";
import { loadConfig, ConfigError } from "../config/loader.js";

interface RunOptions {
  config: string;
  dryRun?: boolean;
}

export async function runOnce(opts: RunOptions): Promise<void> {
  let cfg;
  try {
    cfg = await loadConfig(opts.config);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(chalk.red(err.message));
      process.exit(1);
    }
    throw err;
  }

  console.log(chalk.cyan("gh-signal") + " — running one-shot detection...");
  console.log(chalk.dim(`Dedup window: ${cfg.dedup_window_days}d`));
  if (opts.dryRun) {
    console.log(chalk.yellow("Dry-run mode: outputs disabled"));
  }
  // Signal engine wired in commit 12
  console.log(chalk.dim("Signal engine not yet initialized — coming in a future commit."));
}
