import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient } from "../src/github/client.js";

// Minimal Octokit shape we exercise
const mockOctokit = {
  search: {
    users: vi.fn(),
    code: vi.fn(),
  },
  orgs: {
    get: vi.fn(),
    listMembers: vi.fn(),
  },
  repos: {
    listForOrg: vi.fn(),
  },
  rateLimit: {
    get: vi.fn(),
  },
};

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

vi.mock("@octokit/graphql", () => ({
  graphql: Object.assign(vi.fn(), {
    defaults: vi.fn(() => vi.fn()),
  }),
}));

function makeHeaders(remaining = 4500, reset?: number) {
  return {
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-reset": String(reset ?? Math.floor(Date.now() / 1000) + 3600),
  };
}

describe("GitHubClient", () => {
  let client: GitHubClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GitHubClient("ghp_fake_token");
  });

  it("throws if token is empty", () => {
    expect(() => new GitHubClient("")).toThrow("GITHUB_TOKEN is not set");
  });

  it("searchOrgs calls octokit.search.users with type:org appended", async () => {
    mockOctokit.search.users.mockResolvedValueOnce({
      data: { total_count: 1, items: [{ login: "acme" }] },
      headers: makeHeaders(),
    });

    const result = await client.searchOrgs("language:TypeScript");
    expect(mockOctokit.search.users).toHaveBeenCalledWith(
      expect.objectContaining({ q: "language:TypeScript type:org" })
    );
    expect(result.total_count).toBe(1);
  });

  it("getOrg returns org data", async () => {
    mockOctokit.orgs.get.mockResolvedValueOnce({
      data: { login: "acme", public_repos: 10 },
      headers: makeHeaders(),
    });

    const org = await client.getOrg("acme");
    expect(org.login).toBe("acme");
  });

  it("listOrgMembers paginates with provided page", async () => {
    mockOctokit.orgs.listMembers.mockResolvedValueOnce({
      data: [{ login: "alice" }],
      headers: makeHeaders(),
    });

    await client.listOrgMembers("acme", 2, 10);
    expect(mockOctokit.orgs.listMembers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, per_page: 10 })
    );
  });

  it("withRetry retries on 429 and eventually resolves", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) {
        const err = Object.assign(new Error("rate limited"), { status: 429 });
        throw err;
      }
      return "ok";
    });

    // Speed up the retry wait for tests
    vi.useFakeTimers();
    const promise = client.withRetry(fn, 3);
    // Advance past both RETRY_AFTER_MS waits
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("withRetry throws immediately on non-retryable errors", async () => {
    const fn = vi.fn(async () => {
      throw Object.assign(new Error("not found"), { status: 404 });
    });

    await expect(client.withRetry(fn, 3)).rejects.toThrow("not found");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
