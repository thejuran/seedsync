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
