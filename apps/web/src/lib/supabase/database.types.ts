export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Row<T> = T
type Ins<T> = T
type Upd<T> = Partial<T>

type ProfileRow = {
  avatar_url: string | null
  bio: string | null
  birth_date: string | null
  company: string | null
  created_at: string
  email: string | null
  email_notifications: boolean
  full_name: string | null
  id: string
  job_title: string | null
  location: string | null
  occupation: string | null
  occupation_updated_at: string | null
  onboarded_at: string | null
  plan: string
  referral_other: string | null
  referral_source: string | null
  save_history: boolean
  stripe_customer_id: string | null
  updated_at: string
  username: string | null
  website: string | null
}

type ScanRow = {
  completed_at: string | null
  created_at: string
  depth: number
  device: string
  error: string | null
  grade: string | null
  id: string
  is_public: boolean
  overall_score: number | null
  progress: number
  share_slug: string | null
  stage: string | null
  status: string
  type: string
  url: string
  user_id: string | null
}

type ScanResultRow = {
  created_at: string
  lighthouse_raw: Json | null
  report: Json
  scan_id: string
}

type ScanPageRow = {
  created_at: string
  id: string
  issues: Json
  scan_id: string
  score: number | null
  status_code: number | null
  url: string
}

type TextCheckRow = {
  ai_score_after: number | null
  ai_score_before: number | null
  created_at: string
  engine: string | null
  id: string
  input_text: string | null
  kind: string
  output_text: string | null
  result: Json | null
  similarity: number | null
  strength: string | null
  title: string | null
  tone: string | null
  user_id: string | null
  word_count: number
}

type UsageRow = {
  detect_words_used: number
  humanize_words_used: number
  period_start: string
  scans_used: number
  user_id: string
}

type SubscriptionRow = {
  cancel_at_period_end: boolean
  created_at: string
  current_period_end: string | null
  id: string
  plan: string
  status: string
  stripe_subscription_id: string | null
  updated_at: string
  user_id: string
}

type BenchmarkRunRow = {
  avg_score: number | null
  details: Json | null
  detector: string
  id: string
  model_version: string
  pass_rate_20: number | null
  run_at: string
  samples: number
}

type DailyContentRow = {
  content_hash: string
  created_at: string
  day: string
  id: number
  parent_hash: string | null
  user_id: string
}

type DailyScanRow = {
  count: number
  day: string
  user_id: string
}

type DeveloperRow = {
  avatar_url: string | null
  bio: string
  created_at: string
  email: string | null
  experience: string | null
  facebook_handle: string | null
  gallery: Json
  headline: string
  id: string
  instagram_handle: string | null
  is_available: boolean
  is_owner: boolean
  is_published: boolean
  is_verified: boolean
  kind: string
  languages: string[]
  linkedin_url: string | null
  location: string | null
  name: string
  phone: string | null
  portfolio_url: string | null
  services: Json
  skills: string[]
  slug: string
  sort_order: number
  specialties: string[]
  starting_rate: string | null
  updated_at: string
  user_id: string | null
  whatsapp: string | null
  x_handle: string | null
}

type AccountDeviceRow = {
  created_at: string
  device_hash: string | null
  fingerprint_hash: string | null
  id: number
  ip_hash: string | null
  source: "signup" | "google" | "login"
  user_id: string | null
}

type QuotaLinkRow = {
  created_at: string
  owner_id: string
  user_id: string
}

type ComparisonRow = {
  created_at: string
  device: string
  id: string
  is_public: boolean
  share_slug: string | null
  site_url: string
  user_id: string
}

type ComparisonSiteRow = {
  comparison_id: string
  position: number
  scan_id: string | null
  url: string
}

type ApiKeyRow = {
  created_at: string
  id: string
  key_hash: string
  last_used_at: string | null
  name: string
  prefix: string
  revoked_at: string | null
  user_id: string
}

type ApiRequestRow = {
  created_at: string
  duration_ms: number
  id: number
  key_id: string | null
  method: string
  path: string
  status: number
  user_id: string
}

type ApiWebhookRow = {
  created_at: string
  enabled: boolean
  last_delivered_at: string | null
  last_error: string | null
  last_status: number | null
  secret: string
  updated_at: string
  url: string
  user_id: string
}

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      profiles: {
        Row: Row<ProfileRow>
        Insert: Ins<Optional<ProfileRow, Exclude<keyof ProfileRow, "id">>>
        Update: Upd<ProfileRow>
        Relationships: []
      }
      scans: {
        Row: Row<ScanRow>
        Insert: Ins<Optional<ScanRow, Exclude<keyof ScanRow, "url">>>
        Update: Upd<ScanRow>
        Relationships: []
      }
      scan_results: {
        Row: Row<ScanResultRow>
        Insert: Ins<Optional<ScanResultRow, "created_at" | "lighthouse_raw">>
        Update: Upd<ScanResultRow>
        Relationships: []
      }
      scan_pages: {
        Row: Row<ScanPageRow>
        Insert: Ins<Optional<ScanPageRow, "created_at" | "id" | "issues" | "score" | "status_code">>
        Update: Upd<ScanPageRow>
        Relationships: []
      }
      text_checks: {
        Row: Row<TextCheckRow>
        Insert: Ins<Optional<TextCheckRow, Exclude<keyof TextCheckRow, "kind">>>
        Update: Upd<TextCheckRow>
        Relationships: []
      }
      usage: {
        Row: Row<UsageRow>
        Insert: Ins<Optional<UsageRow, "detect_words_used" | "humanize_words_used" | "scans_used">>
        Update: Upd<UsageRow>
        Relationships: []
      }
      subscriptions: {
        Row: Row<SubscriptionRow>
        Insert: Ins<Optional<SubscriptionRow, "cancel_at_period_end" | "created_at" | "current_period_end" | "id" | "stripe_subscription_id" | "updated_at">>
        Update: Upd<SubscriptionRow>
        Relationships: []
      }
      benchmark_runs: {
        Row: Row<BenchmarkRunRow>
        Insert: Ins<Optional<BenchmarkRunRow, "avg_score" | "details" | "id" | "pass_rate_20" | "run_at">>
        Update: Upd<BenchmarkRunRow>
        Relationships: []
      }
      daily_contents: {
        Row: Row<DailyContentRow>
        Insert: Ins<Optional<Omit<DailyContentRow, "id">, "created_at" | "day" | "parent_hash">>
        Update: Upd<Omit<DailyContentRow, "id">>
        Relationships: []
      }
      daily_scans: {
        Row: Row<DailyScanRow>
        Insert: Ins<Optional<DailyScanRow, "count" | "day">>
        Update: Upd<DailyScanRow>
        Relationships: []
      }
      developers: {
        Row: Row<DeveloperRow>
        Insert: Ins<Optional<DeveloperRow, Exclude<keyof DeveloperRow, "bio" | "headline" | "name" | "slug">>>
        Update: Upd<DeveloperRow>
        Relationships: []
      }
      account_devices: {
        Row: Row<AccountDeviceRow>
        Insert: Ins<Optional<Omit<AccountDeviceRow, "id">, "created_at" | "device_hash" | "fingerprint_hash" | "ip_hash" | "user_id">>
        Update: Upd<Omit<AccountDeviceRow, "id">>
        Relationships: []
      }
      quota_links: {
        Row: Row<QuotaLinkRow>
        Insert: Ins<Optional<QuotaLinkRow, "created_at">>
        Update: Upd<QuotaLinkRow>
        Relationships: []
      }
      comparisons: {
        Row: Row<ComparisonRow>
        Insert: Ins<Optional<ComparisonRow, "created_at" | "device" | "id" | "is_public" | "share_slug">>
        Update: Upd<ComparisonRow>
        Relationships: []
      }
      comparison_sites: {
        Row: Row<ComparisonSiteRow>
        Insert: Ins<Optional<ComparisonSiteRow, "scan_id">>
        Update: Upd<ComparisonSiteRow>
        Relationships: [
          {
            foreignKeyName: "comparison_sites_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: Row<ApiKeyRow>
        Insert: Ins<Optional<ApiKeyRow, "created_at" | "id" | "last_used_at" | "revoked_at">>
        Update: Upd<ApiKeyRow>
        Relationships: []
      }
      api_requests: {
        Row: Row<ApiRequestRow>
        Insert: Ins<Optional<Omit<ApiRequestRow, "id">, "created_at" | "duration_ms" | "key_id">>
        Update: Upd<Omit<ApiRequestRow, "id">>
        Relationships: []
      }
      api_webhooks: {
        Row: Row<ApiWebhookRow>
        Insert: Ins<Optional<ApiWebhookRow, "created_at" | "enabled" | "last_delivered_at" | "last_error" | "last_status" | "updated_at">>
        Update: Upd<ApiWebhookRow>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      claim_content: { Args: { p_hash: string }; Returns: boolean }
      claim_content_for: { Args: { p_hash: string; p_user: string }; Returns: boolean }
      consume_daily_scan: { Args: never; Returns: boolean }
      consume_daily_scan_for: { Args: { p_user: string }; Returns: boolean }
      get_daily_usage_for: { Args: { p_user: string }; Returns: { contents_used: number; scans_used: number; shared: boolean }[] }
      delete_current_user: { Args: never; Returns: undefined }
      email_in_use: { Args: { p_email: string; p_exclude?: string }; Returns: boolean }
      get_shared_report: { Args: { p_slug: string }; Returns: { url: string; device: string; created_at: string; report: Json }[] }
      get_shared_comparison: { Args: { p_slug: string }; Returns: Json | null }
      get_daily_usage: { Args: never; Returns: { contents_used: number; scans_used: number; shared: boolean }[] }
      increment_usage: { Args: { p_amount: number; p_field: string }; Returns: boolean }
      plan_limit: { Args: { p_field: string; p_plan: string }; Returns: number }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicTables = Database["public"]["Tables"]
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"]
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"]
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"]
