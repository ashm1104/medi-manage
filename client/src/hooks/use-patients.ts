import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertPatient, Patient } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function usePatients() {
  return useQuery({
    queryKey: [api.patients.list.path],
  });
}

export function usePatient(id: number) {
  return useQuery({
    queryKey: [buildUrl(api.patients.get.path, { id })],
    enabled: !!id,
  });
}

export function useCreatePatient() {
  return useMutation({
    mutationFn: async (data: InsertPatient) => {
      const res = await apiRequest(api.patients.create.method, api.patients.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
    },
  });
}

export function useUpdatePatient() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Patient> & { id: number }) => {
      const res = await apiRequest(api.patients.update.method, buildUrl(api.patients.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
    },
  });
}

export function useDeletePatient() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(api.patients.delete.method, buildUrl(api.patients.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
    },
  });
}

export function useLinkFacility() {
  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: number; data: any }) => {
      const res = await apiRequest("POST", buildUrl(api.patients.linkFacility.path, { id: patientId }), data);
      return res.json();
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.patients.get.path, { id: patientId })] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
    },
  });
}
