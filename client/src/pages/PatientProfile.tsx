import { useRoute } from "wouter";
import { Layout } from "@/components/ui/Layout";
import { usePatient, useLinkFacility } from "@/hooks/use-patients";
import { useFacilities } from "@/hooks/use-facilities";
import { 
  User, Phone, FileText, Building2, Calendar, 
  Plus, History, BriefcaseMedical, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function PatientProfile() {
  const [, params] = useRoute("/patients/:id");
  const id = Number(params?.id);
  const { data, isLoading } = usePatient(id);
  const { data: allFacilities } = useFacilities();
  const linkMutation = useLinkFacility();
  const { toast } = useToast();
  
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [isPrimary, setIsPrimary] = useState(false);

  if (isLoading) return <Layout><Skeleton className="h-full w-full" /></Layout>;
  if (!data) return <Layout>Patient not found</Layout>;

  const { patient, facilities: linkedFacilities, acknowledgments, cases } = data;

  const handleLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;
    
    linkMutation.mutate({
      patientId: id,
      data: { facility_id: Number(selectedFacility), is_primary: isPrimary }
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Facility linked successfully" });
        setSelectedFacility("");
        setIsPrimary(false);
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900">{patient.name_or_code}</h2>
            <div className="flex items-center gap-4 mt-1 text-slate-500">
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {patient.phone || "No phone"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" /> Recent Acknowledgments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-6 py-3 text-left">Ack No</th>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {acknowledgments.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No records found</td></tr>
                    ) : (
                      acknowledgments.map((ack: any) => (
                        <tr key={ack.id}>
                          <td className="px-6 py-4 font-mono">{ack.ack_no}</td>
                          <td className="px-6 py-4">{format(new Date(ack.ack_date), "MMM d, yyyy")}</td>
                          <td className="px-6 py-4 text-right font-medium">${Number(ack.amount_final).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BriefcaseMedical className="h-5 w-5 text-blue-600" /> Medical Cases
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {cases.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No cases recorded</div>
                  ) : (
                    cases.map((c: any) => (
                      <Link key={c.id} href={`/cases/${c.id}`}>
                        <div className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-900">{c.case_title}</div>
                            <div className="text-xs text-slate-500">Started: {format(new Date(c.start_date), "MMM d, yyyy")}</div>
                          </div>
                          <Badge variant={c.status === 'OPEN' ? 'default' : 'secondary'}>{c.status}</Badge>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" /> Linked Facilities
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {linkedFacilities.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <Link href={`/facilities/${f.id}`} className="font-medium text-blue-600 hover:underline">
                        {f.facility_name}
                      </Link>
                      {f.is_primary && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Primary</Badge>}
                    </div>
                  ))}

                  <form onSubmit={handleLink} className="space-y-3 pt-4 border-t border-slate-100">
                    <Label className="text-xs uppercase tracking-wider text-slate-400">Link New Facility</Label>
                    <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                      <SelectContent>
                        {allFacilities?.map((f: any) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.facility_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Checkbox id="primary" checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} />
                      <Label htmlFor="primary" className="text-sm">Set as primary facility</Label>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={linkMutation.isPending}>
                      Link Facility
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{patient.notes || "No notes available for this patient."}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
