import { useRoute } from "wouter";
import { Layout } from "@/components/ui/Layout";
import { useCase } from "@/hooks/use-cases";
import { 
  BriefcaseMedical, User, Building2, Calendar, 
  CheckCircle2, Clock, FileText 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";

export default function CaseProfile() {
  const [, params] = useRoute("/cases/:id");
  const id = Number(params?.id);
  const { data, isLoading } = useCase(id);

  if (isLoading) return <Layout><Skeleton className="h-full w-full" /></Layout>;
  if (!data) return <Layout>Case not found</Layout>;

  const { case: caseData, patient_name, facility_name } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <BriefcaseMedical className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold text-slate-900">{caseData.case_title}</h2>
              <div className="flex items-center gap-4 mt-1">
                <Badge variant={caseData.status === 'OPEN' ? 'default' : 'secondary'} className="bg-blue-600">
                  {caseData.status === 'OPEN' ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {caseData.status}
                </Badge>
                <span className="text-slate-500 text-sm flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Started {format(new Date(caseData.start_date), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-slate-200 hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Patient Information</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <Link href={`/patients/${caseData.patient_id}`} className="text-2xl font-bold text-blue-600 hover:underline">
                {patient_name}
              </Link>
              <p className="text-xs text-slate-400 mt-1">Click to view patient profile</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Primary Facility</CardTitle>
              <Building2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {caseData.primary_facility_id ? (
                <>
                  <Link href={`/facilities/${caseData.primary_facility_id}`} className="text-2xl font-bold text-emerald-600 hover:underline">
                    {facility_name}
                  </Link>
                  <p className="text-xs text-slate-400 mt-1">Click to view facility profile</p>
                </>
              ) : (
                <div className="text-2xl font-bold text-slate-300">Not linked</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Case Details & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {caseData.notes || "No detailed notes provided for this case."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
