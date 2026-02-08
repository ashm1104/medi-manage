import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertAckDoc, AckDoc } from "@shared/schema";

export function useAcknowledgments() {
  return useQuery({
    queryKey: [api.acknowledgments.list.path],
    queryFn: async () => {
      const res = await fetch(api.acknowledgments.list.path);
      if (!res.ok) throw new Error("Failed to fetch acknowledgments");
      return api.acknowledgments.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAcknowledgment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertAckDoc) => {
      const res = await fetch(api.acknowledgments.create.path, {
        method: api.acknowledgments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create acknowledgment");
      return api.acknowledgments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
    },
  });
}

export function useDeleteAcknowledgment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.acknowledgments.delete.path, { id });
      const res = await fetch(url, { method: api.acknowledgments.delete.method });
      if (!res.ok) throw new Error("Failed to delete acknowledgment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
    },
  });
}
