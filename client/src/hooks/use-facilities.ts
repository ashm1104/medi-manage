import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertFacility, Facility } from "@shared/schema";

export function useFacilities() {
  return useQuery({
    queryKey: [api.facilities.list.path],
    queryFn: async () => {
      const res = await fetch(api.facilities.list.path);
      if (!res.ok) throw new Error("Failed to fetch facilities");
      return api.facilities.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertFacility) => {
      const res = await fetch(api.facilities.create.path, {
        method: api.facilities.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create facility");
      return api.facilities.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
    },
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertFacility>) => {
      const url = buildUrl(api.facilities.update.path, { id });
      const res = await fetch(url, {
        method: api.facilities.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update facility");
      return api.facilities.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
    },
  });
}

export function useDeleteFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.facilities.delete.path, { id });
      const res = await fetch(url, { method: api.facilities.delete.method });
      if (!res.ok) throw new Error("Failed to delete facility");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
    },
  });
}
