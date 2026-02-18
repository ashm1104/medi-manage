import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertFacility, Facility } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useFacilities() {
  return useQuery({
    queryKey: [api.facilities.list.path],
  });
}

export function useFacility(id: number) {
  return useQuery({
    queryKey: [buildUrl(api.facilities.get.path, { id })],
    enabled: !!id,
  });
}

export function useCreateFacility() {
  return useMutation({
    mutationFn: async (data: InsertFacility) => {
      const res = await apiRequest(api.facilities.create.method, api.facilities.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
    },
  });
}

export function useUpdateFacility() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Facility> & { id: number }) => {
      const res = await apiRequest(api.facilities.update.method, buildUrl(api.facilities.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
    },
  });
}

export function useDeleteFacility() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(api.facilities.delete.method, buildUrl(api.facilities.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
    },
  });
}
