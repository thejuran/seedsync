import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  ContractPoints,
  ContractTimelineResponse,
  PointBalance,
} from "../types";

export function useContractPoints(contractId: number) {
  return useQuery({
    queryKey: ["points", contractId],
    queryFn: () =>
      api.get<ContractPoints>(`/contracts/${contractId}/points`),
    enabled: contractId > 0,
  });
}

export function useContractTimeline(contractId: number) {
  return useQuery({
    queryKey: ["timeline", contractId],
    queryFn: () =>
      api.get<ContractTimelineResponse>(`/contracts/${contractId}/timeline`),
    enabled: contractId > 0,
  });
}

export function useCreatePointBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      data,
    }: {
      contractId: number;
      data: {
        use_year: number;
        allocation_type: string;
        points: number;
      };
    }) => api.post<PointBalance>(`/contracts/${contractId}/points`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["points", variables.contractId],
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useUpdatePointBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      balanceId,
      points,
    }: {
      balanceId: number;
      points: number;
      contractId: number;
    }) => api.put<PointBalance>(`/points/${balanceId}`, { points }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["points", variables.contractId],
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useDeletePointBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      balanceId,
    }: {
      balanceId: number;
      contractId: number;
    }) => api.delete(`/points/${balanceId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["points", variables.contractId],
      });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}
