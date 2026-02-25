import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Case, InsertCase } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useCases() {
  return useQuery({
    queryKey: [api.cases.list.path],
  });
}

export function useCase(id: string) {
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

export function useUpdateCase() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Case> & { id: string }) => {
      const res = await apiRequest(api.cases.update.method, buildUrl(api.cases.update.path, { id }), data);
      return res.json();
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.cases.list.path] });
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.cases.get.path, { id: variables.id })] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [first] = query.queryKey;
          return typeof first === "string" && (
            first.startsWith("/api/patients/") || first.startsWith("/api/facilities/")
          );
        },
      });
    },
  });
}
