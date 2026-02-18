import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertAckDoc } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAcknowledgments() {
  return useQuery({
    queryKey: [api.acknowledgments.list.path],
  });
}

export function useCreateAcknowledgment() {
  return useMutation({
    mutationFn: async (data: InsertAckDoc) => {
      const res = await apiRequest(api.acknowledgments.create.method, api.acknowledgments.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
    },
  });
}

export function useDeleteAcknowledgment() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(api.acknowledgments.delete.method, buildUrl(api.acknowledgments.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
    },
  });
}
