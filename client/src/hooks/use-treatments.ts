import { useMutation, useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type TreatmentCreateInput = {
  treatment_title: string;
  treatment_start_date: string;
  treatment_status?: string;
  treatment_notes?: string | null;
  treatment_closure_date?: string | null;
  treatment_closure_notes?: string | null;
  treatment_type?: string | null;
  treatment_sub_type?: string | null;
  primary_facility_id?: string | null;
};

export type TreatmentUpdateInput = Partial<TreatmentCreateInput>;

export function usePatientTreatments(patientId: string) {
  return useQuery({
    queryKey: [buildUrl(api.patients.treatments.list.path, { patientId })],
    enabled: !!patientId,
  });
}

export function usePatientTreatment(patientId: string, treatmentId: string) {
  return useQuery({
    queryKey: [buildUrl(api.patients.treatments.get.path, { patientId, treatmentId })],
    enabled: !!patientId && !!treatmentId,
  });
}

export function useCreatePatientTreatment() {
  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: TreatmentCreateInput }) => {
      const res = await apiRequest(
        api.patients.treatments.create.method,
        buildUrl(api.patients.treatments.create.path, { patientId }),
        data,
      );
      return res.json();
    },
    onSuccess: (_result, variables) => {
      const patientId = variables.patientId;
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.patients.get.path, { id: patientId })] });
      queryClient.invalidateQueries({
        queryKey: [buildUrl(api.patients.treatments.list.path, { patientId })],
      });
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
    },
  });
}

export function useUpdatePatientTreatment() {
  return useMutation({
    mutationFn: async ({
      patientId,
      treatmentId,
      data,
    }: {
      patientId: string;
      treatmentId: string;
      data: TreatmentUpdateInput;
    }) => {
      const res = await apiRequest(
        api.patients.treatments.update.method,
        buildUrl(api.patients.treatments.update.path, { patientId, treatmentId }),
        data,
      );
      return res.json();
    },
    onSuccess: (_result, variables) => {
      const { patientId, treatmentId } = variables;
      queryClient.invalidateQueries({ queryKey: [buildUrl(api.patients.get.path, { id: patientId })] });
      queryClient.invalidateQueries({
        queryKey: [buildUrl(api.patients.treatments.list.path, { patientId })],
      });
      queryClient.invalidateQueries({
        queryKey: [buildUrl(api.patients.treatments.get.path, { patientId, treatmentId })],
      });
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
    },
  });
}

