export type SignalType =
  | "new_org"
  | "hiring_surge"
  | "tech_pivot"
  | "repo_momentum"
  | "competitor_mention";

export interface GitHubOrg {
  login: string;
  name: string | null;
  description: string | null;
  blog: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  created_at: string;
}

export interface Signal {
  type: SignalType;
  org: GitHubOrg;
  detected_at: string;
  context: SignalContext;
}

export type SignalContext =
  | NewOrgContext
  | HiringSurgeContext
  | TechPivotContext
  | RepoMomentumContext
  | CompetitorMentionContext;

export interface NewOrgContext {
  type: "new_org";
  created_at: string;
  initial_repo_count: number;
  top_language: string | null;
}

export interface HiringSurgeContext {
  type: "hiring_surge";
  previous_member_count: number;
  current_member_count: number;
  new_members: number;
  window_days: number;
}

export interface TechPivotContext {
  type: "tech_pivot";
  new_language: string;
  percentage: number;
  repo_count: number;
}

export interface RepoMomentumContext {
  type: "repo_momentum";
  repo_name: string;
  stars_gained: number;
  window_days: number;
  stars_per_day: number;
}

export interface CompetitorMentionContext {
  type: "competitor_mention";
  competitor: string;
  repo_name: string;
  file_path: string;
}
