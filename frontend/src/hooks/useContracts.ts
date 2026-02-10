import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ContractWithDetails, Contract, Resort } from "../types";

export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: () => api.get<ContractWithDetails[]>("/contracts/"),
  });
}

export function useContract(id: number) {
  return useQuery({
    queryKey: ["contracts", id],
    queryFn: () => api.get<ContractWithDetails>(`/contracts/${id}`),
    enabled: id > 0,
  });
}

export function useResorts() {
  return useQuery({
    queryKey: ["resorts"],
    queryFn: () => api.get<Resort[]>("/resorts"),
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name?: string;
      home_resort: string;
      use_year_month: number;
      annual_points: number;
      purchase_type: string;
    }) => api.post<Contract>("/contracts/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{
        name: string;
        home_resort: string;
        use_year_month: number;
        annual_points: number;
        purchase_type: string;
      }>;
    }) => api.put<Contract>(`/contracts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}
