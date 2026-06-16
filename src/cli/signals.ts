import chalk from "chalk";

interface SignalsOptions {
  config: string;
  format: string;
  output?: string;
  limit: string;
}

export async function runSignals(opts: SignalsOptions): Promise<void> {
  console.log(chalk.cyan("gh-signal signals") + ` — listing (limit: ${opts.limit})`);
  console.log(chalk.dim(`Format: ${opts.format}`));
  if (opts.output) {
    console.log(chalk.dim(`Output: ${opts.output}`));
  }
  // DB reads wired in commit 4
  console.log(chalk.dim("Signal store not yet initialized — coming in a future commit."));
}
