import type { SignalType } from "./signal.js";

export interface Prospect {
  org_login: string;
  org_name: string | null;
  website: string | null;
  description: string | null;
  member_count: number | null;
  top_language: string | null;
  repo_count: number;
  enriched_at: string;
  hubspot_contact_id: string | null;
}

export interface SignalRecord {
  id?: number;
  org_login: string;
  signal_type: SignalType;
  signal_data: string;
  first_seen_at: string;
  last_seen_at: string;
  notified: number;
}
