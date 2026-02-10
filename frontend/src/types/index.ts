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

export interface Resort {
  slug: string;
  name: string;
  short_name: string;
  restricted: boolean;  // true for post-2019 resorts
}
