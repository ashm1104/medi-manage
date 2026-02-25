import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertAckDoc } from "@shared/schema";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";

function generateAckNumber(dateInput?: string): string {
  const date = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ACK-${yyyy}${mm}${dd}-${random}`;
}

export function useAcknowledgments() {
  return useQuery({
    queryKey: [api.acknowledgments.list.path],
  });
}

export function useCreateAcknowledgment() {
  return useMutation({
    mutationFn: async (data: InsertAckDoc) => {
      const maxAttempts = 5;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const payload: InsertAckDoc = {
          ...data,
          ack_no: generateAckNumber(data.ack_date),
        };

        try {
          const res = await apiRequest(
            api.acknowledgments.create.method,
            api.acknowledgments.create.path,
            payload,
          );
          return res.json();
        } catch (error) {
          const isUniqueViolation =
            error instanceof ApiError &&
            error.code === "23505";

          if (!isUniqueViolation || attempt === maxAttempts) {
            throw error;
          }
        }
      }

      throw new Error("Failed to create acknowledgment after retries");
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.removeQueries({
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && first.startsWith(api.acknowledgments.latest.path);
        },
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && first.startsWith(api.acknowledgments.latest.path);
        },
      });
      if (variables.patient_id) {
        queryClient.invalidateQueries({
          queryKey: [buildUrl(api.patients.get.path, { id: variables.patient_id })],
        });
      }
    },
  });
}

export function useDeleteAcknowledgment() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(api.acknowledgments.delete.method, buildUrl(api.acknowledgments.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
      queryClient.setQueriesData({
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && first.startsWith(api.acknowledgments.latest.path);
        },
      }, null);
      queryClient.removeQueries({
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && first.startsWith(api.acknowledgments.latest.path);
        },
      });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && first.startsWith(api.acknowledgments.latest.path);
        },
      });
    },
  });
}

export function useLatestAcknowledgment(patientId: string, facilityId: string) {
  const params = new URLSearchParams({ patient_id: patientId, facility_id: facilityId });
  const url = `${api.acknowledgments.latest.path}?${params.toString()}`;
  return useQuery({
    queryKey: [url],
    enabled: !!patientId && !!facilityId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
  });
}

export function useGenerateAckPdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(
        api.acknowledgments.generatePdf.method,
        buildUrl(api.acknowledgments.generatePdf.path, { id }),
      );
      return res.json() as Promise<{ pdf_path: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.acknowledgments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && first.startsWith("/api/patients/");
        },
      });
    },
  });
}

export function getAckPdfViewUrl(id: string) {
  return buildUrl(api.acknowledgments.viewPdf.path, { id });
}
