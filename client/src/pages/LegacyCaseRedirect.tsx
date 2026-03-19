import { Redirect, useRoute } from "wouter";
import { Layout } from "@/components/ui/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useCase } from "@/hooks/use-cases";

export default function LegacyCaseRedirect() {
  const [, params] = useRoute("/cases/:id");
  const id = params?.id ?? "";
  const { data, isLoading } = useCase(id);
  const caseData = (data as any)?.case;
  const patientId = caseData?.patient_id;

  if (isLoading) return <Layout><Skeleton className="h-full w-full" /></Layout>;
  if (!patientId) return <Layout>Treatment not found</Layout>;

  return <Redirect to={`/patients/${patientId}/treatments/${id}`} />;
}

