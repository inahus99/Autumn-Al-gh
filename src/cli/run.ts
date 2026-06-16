import chalk from "chalk";

interface RunOptions {
  config: string;
  dryRun?: boolean;
}

export async function runOnce(opts: RunOptions): Promise<void> {
  console.log(chalk.cyan("gh-signal") + " — running one-shot detection...");
  console.log(chalk.dim(`Config: ${opts.config}`));
  if (opts.dryRun) {
    console.log(chalk.yellow("Dry-run mode: outputs disabled"));
  }
  // Signal engine wired in commit 12
  console.log(chalk.dim("Signal engine not yet initialized — coming in a future commit."));
}
