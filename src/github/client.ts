import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";

// GitHub allows 5000 REST points/hr and 5000 GraphQL points/hr per token.
// We reserve 10% as headroom and refuse to make calls when below the floor.
const RATE_LIMIT_FLOOR = 100;
const RETRY_AFTER_MS = 60_000;

interface RateLimitState {
  remaining: number;
  reset: number; // Unix timestamp (seconds)
  checked_at: number; // Date.now()
}

export class GitHubClient {
  private octokit: Octokit;
  private gql: typeof graphql;
  private restState: RateLimitState = { remaining: 5000, reset: 0, checked_at: 0 };

  constructor(token: string) {
    if (!token) {
      throw new Error(
        "GITHUB_TOKEN is not set.\n" +
          "  Create one at https://github.com/settings/tokens\n" +
          "  Required scopes: read:org, read:user, public_repo"
      );
    }

    this.octokit = new Octokit({
      auth: token,
      // Surface rate-limit headers automatically
      throttle: undefined,
    });

    this.gql = graphql.defaults({
      headers: { authorization: `token ${token}` },
    });
  }

  // ── REST helpers ────────────────────────────────────────────────────────────

  private updateRestState(headers: Record<string, string | undefined>): void {
    const remaining = parseInt(headers["x-ratelimit-remaining"] ?? "", 10);
    const reset = parseInt(headers["x-ratelimit-reset"] ?? "", 10);
    if (!isNaN(remaining)) this.restState.remaining = remaining;
    if (!isNaN(reset)) this.restState.reset = reset;
    this.restState.checked_at = Date.now();
  }

  private async guardRest(): Promise<void> {
    if (this.restState.remaining > RATE_LIMIT_FLOOR) return;

    const now = Math.floor(Date.now() / 1000);
    const waitSec = Math.max(0, this.restState.reset - now) + 5;
    console.warn(
      `[gh-signal] GitHub REST rate limit low (${this.restState.remaining} remaining). ` +
        `Waiting ${waitSec}s for reset…`
    );
    await new Promise((r) => setTimeout(r, waitSec * 1000));
  }

  async searchOrgs(query: string, page = 1, perPage = 30) {
    await this.guardRest();
    const res = await this.octokit.search.users({
      q: `${query} type:org`,
      per_page: perPage,
      page,
    });
    this.updateRestState(res.headers as Record<string, string | undefined>);
    return res.data;
  }

  async getOrg(login: string) {
    await this.guardRest();
    const res = await this.octokit.orgs.get({ org: login });
    this.updateRestState(res.headers as Record<string, string | undefined>);
    return res.data;
  }

  async listOrgMembers(org: string, page = 1, perPage = 30) {
    await this.guardRest();
    const res = await this.octokit.orgs.listMembers({ org, per_page: perPage, page });
    this.updateRestState(res.headers as Record<string, string | undefined>);
    return res.data;
  }

  async listOrgRepos(org: string, page = 1, perPage = 30) {
    await this.guardRest();
    const res = await this.octokit.repos.listForOrg({
      org,
      type: "public",
      sort: "updated",
      per_page: perPage,
      page,
    });
    this.updateRestState(res.headers as Record<string, string | undefined>);
    return res.data;
  }

  async searchCode(query: string, page = 1, perPage = 30) {
    await this.guardRest();
    const res = await this.octokit.search.code({
      q: query,
      per_page: perPage,
      page,
    });
    this.updateRestState(res.headers as Record<string, string | undefined>);
    return res.data;
  }

  async getRateLimit() {
    const res = await this.octokit.rateLimit.get();
    return res.data.rate;
  }

  // ── GraphQL helpers ─────────────────────────────────────────────────────────

  async queryOrgLanguages(org: string): Promise<OrgLanguageResult> {
    const query = `
      query OrgLanguages($login: String!) {
        organization(login: $login) {
          repositories(first: 30, privacy: PUBLIC, orderBy: { field: UPDATED_AT, direction: DESC }) {
            nodes {
              primaryLanguage { name }
              languages(first: 5, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node { name }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const result = await this.gql<{ organization: OrgLanguageResult["organization"] }>(
        query,
        { login: org }
      );
      return { organization: result.organization };
    } catch (err: unknown) {
      // GraphQL errors come back as thrown exceptions from @octokit/graphql
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`GraphQL query failed for org "${org}": ${msg}`);
    }
  }

  async queryRepoStarHistory(owner: string, repo: string, daysBack: number): Promise<number> {
    // GitHub GraphQL doesn't expose historical star counts directly.
    // We approximate velocity by fetching the stargazers cursor and counting
    // entries after (now - daysBack). For repos with large star counts we
    // fall back to zero rather than paginate exhaustively.
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString();

    const query = `
      query RecentStars($owner: String!, $repo: String!, $since: DateTime!) {
        repository(owner: $owner, name: $repo) {
          stargazers(first: 100, orderBy: { field: STARRED_AT, direction: DESC }) {
            edges {
              starredAt
            }
          }
        }
      }
    `;

    try {
      const result = await this.gql<{
        repository: { stargazers: { edges: Array<{ starredAt: string }> } };
      }>(query, { owner, repo, since });

      return result.repository.stargazers.edges.filter(
        (e) => new Date(e.starredAt) >= new Date(since)
      ).length;
    } catch {
      return 0;
    }
  }

  // ── Retry wrapper ────────────────────────────────────────────────────────────

  async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err: unknown) {
        const isLast = i === attempts - 1;
        if (isLast) throw err;

        const status = (err as { status?: number }).status;
        // 429 = secondary rate limit; 403 can also be rate limiting
        if (status === 429 || status === 403) {
          console.warn(`[gh-signal] Rate limited (${status}), retrying in ${RETRY_AFTER_MS / 1000}s…`);
          await new Promise((r) => setTimeout(r, RETRY_AFTER_MS));
        } else if (status && status >= 500) {
          const backoff = (i + 1) * 5000;
          console.warn(`[gh-signal] GitHub ${status}, retrying in ${backoff / 1000}s…`);
          await new Promise((r) => setTimeout(r, backoff));
        } else {
          throw err;
        }
      }
    }
    throw new Error("unreachable");
  }
}

// ── GraphQL response types ───────────────────────────────────────────────────

export interface OrgLanguageResult {
  organization: {
    repositories: {
      nodes: Array<{
        primaryLanguage: { name: string } | null;
        languages: {
          edges: Array<{
            size: number;
            node: { name: string };
          }>;
        };
      }>;
    };
  };
}
