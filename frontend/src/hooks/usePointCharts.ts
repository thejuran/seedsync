import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  PointChartSummary,
  PointChart,
  RoomInfo,
  PointCostRequest,
  StayCostResponse,
} from "../types";

export function useAvailableCharts() {
  return useQuery({
    queryKey: ["point-charts"],
    queryFn: () => api.get<PointChartSummary[]>("/point-charts/"),
  });
}

export function usePointChart(resort: string, year: number) {
  return useQuery({
    queryKey: ["point-charts", resort, year],
    queryFn: () => api.get<PointChart>(`/point-charts/${resort}/${year}`),
    enabled: !!resort && !!year,
  });
}

export function useChartRooms(resort: string, year: number) {
  return useQuery({
    queryKey: ["point-charts", resort, year, "rooms"],
    queryFn: () =>
      api.get<{ resort: string; year: number; rooms: RoomInfo[] }>(
        `/point-charts/${resort}/${year}/rooms`
      ),
    enabled: !!resort && !!year,
  });
}

export function useChartSeasons(resort: string, year: number) {
  return useQuery({
    queryKey: ["point-charts", resort, year, "seasons"],
    queryFn: () =>
      api.get<{
        resort: string;
        year: number;
        seasons: { name: string; date_ranges: [string, string][] }[];
      }>(`/point-charts/${resort}/${year}/seasons`),
    enabled: !!resort && !!year,
  });
}

export function useCalculateStayCost() {
  return useMutation({
    mutationFn: (data: PointCostRequest) =>
      api.post<StayCostResponse>("/point-charts/calculate", data),
  });
}
