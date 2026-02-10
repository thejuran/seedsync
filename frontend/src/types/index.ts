export type PurchaseType = "resale" | "direct";
export type PointAllocationType = "current" | "banked" | "borrowed" | "holding";

export const USE_YEAR_MONTHS = [2, 3, 4, 6, 8, 9, 10, 12] as const;
export type UseYearMonth = typeof USE_YEAR_MONTHS[number];

export const USE_YEAR_MONTH_NAMES: Record<UseYearMonth, string> = {
  2: "February",
  3: "March",
  4: "April",
  6: "June",
  8: "August",
  9: "September",
  10: "October",
  12: "December",
};

export const ALLOCATION_TYPE_LABELS: Record<PointAllocationType, string> = {
  current: "Current",
  banked: "Banked",
  borrowed: "Borrowed",
  holding: "Holding",
};

export interface Contract {
  id: number;
  name: string | null;
  home_resort: string;
  use_year_month: UseYearMonth;
  annual_points: number;
  purchase_type: PurchaseType;
  created_at: string;
  updated_at: string;
}

export interface PointBalance {
  id: number;
  contract_id: number;
  use_year: number;
  allocation_type: PointAllocationType;
  points: number;
  updated_at: string;
}

export interface UseYearTimeline {
  use_year: number;
  label: string;
  start: string;
  end: string;
  banking_deadline: string;
  banking_deadline_passed: boolean;
  days_until_banking_deadline: number;
  point_expiration: string;
  days_until_expiration: number;
  status: "expired" | "active" | "upcoming";
}

export interface ContractWithDetails extends Contract {
  point_balances: PointBalance[];
  eligible_resorts: string[];
  use_year_timeline: UseYearTimeline;
}

export interface BalancesByYear {
  [year: string]: {
    current: number;
    banked: number;
    borrowed: number;
    holding: number;
    total: number;
  };
}

export interface ContractPoints {
  contract_id: number;
  contract_name: string | null;
  annual_points: number;
  balances_by_year: BalancesByYear;
  grand_total: number;
}

export interface ContractTimelineResponse {
  contract_id: number;
  use_year_month: number;
  timelines: UseYearTimeline[];
}

export interface Resort {
  slug: string;
  name: string;
  short_name: string;
  location: string;
  restricted: boolean;
}

// Point Chart types

export interface PointChart {
  resort: string;
  year: number;
  seasons: Season[];
}

export interface Season {
  name: string;
  date_ranges: [string, string][];
  rooms: Record<string, { weekday: number; weekend: number }>;
}

export interface RoomInfo {
  key: string;
  room_type: string;
  view: string;
}

export interface PointChartSummary {
  resort: string;
  year: number;
  file: string;
}

export interface NightlyCost {
  date: string;
  day_of_week: string;
  season: string;
  is_weekend: boolean;
  points: number;
}

export interface StayCostResponse {
  resort: string;
  room: string;
  check_in: string;
  check_out: string;
  num_nights: number;
  total_points: number;
  nightly_breakdown: NightlyCost[];
}

export interface PointCostRequest {
  resort: string;
  room_key: string;
  check_in: string;
  check_out: string;
}

// Reservation types

export type ReservationStatus = "confirmed" | "pending" | "cancelled";

export interface Reservation {
  id: number;
  contract_id: number;
  resort: string;
  room_key: string;
  check_in: string;
  check_out: string;
  points_cost: number;
  status: ReservationStatus;
  confirmation_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Availability types

export interface AvailabilityContractResult {
  contract_id: number;
  contract_name: string;
  home_resort: string;
  annual_points: number;
  use_year: number;
  use_year_start: string;
  use_year_end: string;
  use_year_status: string;
  banking_deadline: string;
  banking_deadline_passed: boolean;
  days_until_banking_deadline: number;
  days_until_expiration: number;
  balances: Record<string, number>;
  total_points: number;
  committed_points: number;
  committed_reservation_count: number;
  available_points: number;
}

export interface AvailabilitySummary {
  total_contracts: number;
  total_points: number;
  total_committed: number;
  total_available: number;
}

export interface AvailabilityResponse {
  target_date: string;
  contracts: AvailabilityContractResult[];
  summary: AvailabilitySummary;
}

// Trip Explorer types

export interface TripExplorerOption {
  contract_id: number;
  contract_name: string;
  available_points: number;
  resort: string;
  resort_name: string;
  room_key: string;
  total_points: number;
  num_nights: number;
  points_remaining: number;
  nightly_avg: number;
}

export interface TripExplorerResponse {
  check_in: string;
  check_out: string;
  num_nights: number;
  options: TripExplorerOption[];
  resorts_checked: string[];
  resorts_skipped: string[];
  total_options: number;
}
