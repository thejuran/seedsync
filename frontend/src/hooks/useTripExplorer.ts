import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { TripExplorerResponse } from "../types";

export function useTripExplorer(checkIn: string | null, checkOut: string | null) {
  return useQuery({
    queryKey: ["trip-explorer", checkIn, checkOut],
    queryFn: () =>
      api.get<TripExplorerResponse>(
        `/trip-explorer?check_in=${checkIn}&check_out=${checkOut}`
      ),
    enabled: !!checkIn && !!checkOut,
  });
}
