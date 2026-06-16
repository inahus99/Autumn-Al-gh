import { GitHubClient } from "./client.js";

let _client: GitHubClient | null = null;

export function getGitHubClient(): GitHubClient {
  if (_client) return _client;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is not set.\n" +
        "  Add it to your .env file — see .env.example for instructions."
    );
  }

  _client = new GitHubClient(token);
  return _client;
}

export { GitHubClient } from "./client.js";
export type { OrgLanguageResult } from "./client.js";
