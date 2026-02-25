import { useState, useEffect } from "react";
import { Layout } from "@/components/ui/Layout";
import { useCase, useCreateCase, useCases } from "@/hooks/use-cases";
import { usePatients } from "@/hooks/use-patients";
import { useFacilities } from "@/hooks/use-facilities";
import { Plus, Search, BriefcaseMedical, Calendar, User, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { InsertCase } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Cases() {
  const { data: cases, isLoading } = useCases();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredCases = cases?.filter((c: any) => 
    c.case.case_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Cases</h2>
            <p className="text-slate-500">Manage patient medical cases.</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Case
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search cases or patients..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Facility</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-8 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredCases?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <BriefcaseMedical className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No cases found</p>
                    </td>
                  </tr>
                ) : (
                  filteredCases?.map((c: any) => (
                    <tr key={c.case.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link href={`/cases/${c.case.id}`} className="hover:text-blue-600 transition-colors">
                          {c.case.case_title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/patients/${c.case.patient_id}`} className="text-blue-600 hover:underline">
                          {c.patient_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {c.case.primary_facility_id ? (
                          <Link href={`/facilities/${c.case.primary_facility_id}`} className="text-blue-600 hover:underline">
                            {c.facility_name}
                          </Link>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          c.case.status === 'OPEN'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : c.case.status === "HOLD"
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {c.case.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {format(new Date(c.case.start_date), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/cases/${c.case.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateCaseDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </Layout>
  );
}

function CreateCaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { data: patients } = usePatients();
  const { data: facilities } = useFacilities();
  const createMutation = useCreateCase();
  const [patientId, setPatientId] = useState<string | undefined>(undefined);
  const [facilityId, setFacilityId] = useState("none");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!patientId) {
      toast({ title: "Error", description: "Please select a patient", variant: "destructive" });
      return;
    }

    const data: any = {
      case_title: String(formData.get("case_title") || ""),
      start_date: String(formData.get("start_date") || ""),
      patient_id: patientId,
    };

    if (facilityId === "none" || !facilityId) {
      delete data.primary_facility_id;
    } else {
      data.primary_facility_id = facilityId;
    }

    createMutation.mutate(data as InsertCase, {
      onSuccess: () => {
        toast({ title: "Success", description: "Case created successfully" });
        setPatientId(undefined);
        setFacilityId("none");
        onOpenChange(false);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Case</DialogTitle>
          <DialogDescription>Create a medical case for a patient.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="case_title">Case Title *</Label>
            <Input id="case_title" name="case_title" placeholder="e.g. Annual Checkup" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient_id">Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name_or_code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_facility_id">Facility (Optional)</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {facilities?.map((f: any) => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.facility_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date *</Label>
            <Input id="start_date" name="start_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Case"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
