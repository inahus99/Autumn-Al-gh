export interface IcpConfig {
  min_repo_count: number;
  max_repo_count: number;
  languages: string[];
  exclude_orgs: string[];
}

export interface SignalsConfig {
  new_org: {
    enabled: boolean;
    created_within_days: number;
  };
  hiring_surge: {
    enabled: boolean;
    min_new_members: number;
    window_days: number;
  };
  tech_pivot: {
    enabled: boolean;
    languages: string[];
  };
  repo_momentum: {
    enabled: boolean;
    min_stars_per_day: number;
  };
  competitor_mention: {
    enabled: boolean;
    competitors: string[];
  };
}

export interface OutputsConfig {
  slack?: {
    webhook_url: string;
  };
  hubspot?: {
    api_key: string;
  };
  csv?: {
    path: string;
    format: "apollo" | "instantly" | "generic";
  };
}

export interface GhSignalConfig {
  icp: IcpConfig;
  signals: SignalsConfig;
  outputs: OutputsConfig;
  poll_interval_minutes: number;
  dedup_window_days: number;
}
