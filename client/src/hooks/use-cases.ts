import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertCase } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useCases() {
  return useQuery({
    queryKey: [api.cases.list.path],
  });
}

export function useCase(id: number) {
  return useQuery({
    queryKey: [buildUrl(api.cases.get.path, { id })],
    enabled: !!id,
  });
}

export function useCreateCase() {
  return useMutation({
    mutationFn: async (data: InsertCase) => {
      const res = await apiRequest(api.cases.create.method, api.cases.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cases.list.path] });
    },
  });
}
