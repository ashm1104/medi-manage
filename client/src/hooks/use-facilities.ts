import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertFacility, Facility, AckDoc, Case } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

type FacilityDetails = {
  facility: Facility;
  patients: Array<any>;
  acknowledgments: AckDoc[];
  cases: Case[];
  treatments?: Case[];
};

export function useFacilities() {
  return useQuery<Facility[]>({
    queryKey: [api.facilities.list.path],
  });
}

export function useFacility(id: string) {
  return useQuery<FacilityDetails>({
    queryKey: [buildUrl(api.facilities.get.path, { id })],
    enabled: !!id,
  });
}

export function useCreateFacility() {
  return useMutation({
    mutationFn: async (data: InsertFacility) => {
      const res = await apiRequest(api.facilities.create.method, api.facilities.create.path, data);
      return (await res.json()) as Facility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
    },
  });
}

export function useUpdateFacility() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Facility> & { id: string }) => {
      const res = await apiRequest(api.facilities.update.method, buildUrl(api.facilities.update.path, { id }), data);
      return (await res.json()) as Facility;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
      queryClient.invalidateQueries({
        queryKey: [buildUrl(api.facilities.get.path, { id: variables.id })],
      });
    },
  });
}

export function useDeleteFacility() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(api.facilities.delete.method, buildUrl(api.facilities.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.facilities.list.path] });
    },
  });
}
