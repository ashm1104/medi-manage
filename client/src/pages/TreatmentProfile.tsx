import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { Layout } from "@/components/ui/Layout";
import { usePatientTreatment, useUpdatePatientTreatment } from "@/hooks/use-treatments";
import {
  BriefcaseMedical,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getTreatmentSubTypes, TREATMENT_TYPE_SUBTYPE_MAP } from "@shared/treatments";

type TreatmentStatus = "OPEN" | "HOLD" | "CLOSED";

function normalizeStatus(value: unknown): TreatmentStatus {
  const normalized = typeof value === "string" ? value.toUpperCase() : "OPEN";
  if (normalized === "HOLD") return "HOLD";
  if (normalized === "CLOSED") return "CLOSED";
  return "OPEN";
}

function getStatusClass(status: TreatmentStatus): string {
  if (status === "CLOSED") return "bg-emerald-600 text-white";
  if (status === "HOLD") return "bg-amber-500 text-white";
  return "bg-blue-600 text-white";
}

export default function TreatmentProfile() {
  const [, params] = useRoute("/patients/:patientId/treatments/:treatmentId");
  const patientId = params?.patientId ?? "";
  const treatmentId = params?.treatmentId ?? "";
  const { data, isLoading } = usePatientTreatment(patientId, treatmentId);
  const updateTreatmentMutation = useUpdatePatientTreatment();
  const { toast } = useToast();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<TreatmentStatus>("OPEN");
  const [notesDraft, setNotesDraft] = useState("");
  const [closureDateDraft, setClosureDateDraft] = useState("");
  const [closureNotesDraft, setClosureNotesDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState("");
  const [subTypeDraft, setSubTypeDraft] = useState("");

  const treatmentResponse = data as any;
  const treatment = treatmentResponse?.treatment;
  const patientName = treatmentResponse?.patient_name;
  const facilityName = treatmentResponse?.facility_name;
  const subTypeOptions = useMemo(() => getTreatmentSubTypes(typeDraft), [typeDraft]);

  const resetDrafts = () => {
    if (!treatment) return;
    setTitleDraft(String(treatment.treatment_title ?? ""));
    setStatusDraft(normalizeStatus(treatment.treatment_status));
    setNotesDraft(String(treatment.treatment_notes ?? ""));
    setClosureDateDraft(String(treatment.treatment_closure_date ?? ""));
    setClosureNotesDraft(String(treatment.treatment_closure_notes ?? ""));
    setTypeDraft(String(treatment.treatment_type ?? ""));
    setSubTypeDraft(String(treatment.treatment_sub_type ?? ""));
  };

  useEffect(() => {
    if (!treatment) return;
    resetDrafts();
  }, [
    treatment?.id,
    treatment?.treatment_title,
    treatment?.treatment_status,
    treatment?.treatment_notes,
    treatment?.treatment_closure_date,
    treatment?.treatment_closure_notes,
    treatment?.treatment_type,
    treatment?.treatment_sub_type,
  ]);

  if (isLoading) return <Layout><Skeleton className="h-full w-full" /></Layout>;
  if (!treatment) return <Layout>Treatment not found</Layout>;

  const status = normalizeStatus(treatment.treatment_status);
  const startedOn = format(new Date(treatment.treatment_start_date), "MMM d, yyyy");
  const closedOn = treatment.treatment_closure_date
    ? format(new Date(treatment.treatment_closure_date), "MMM d, yyyy")
    : null;

  const handleSave = () => {
    const title = titleDraft.trim();
    if (!title) {
      toast({ title: "Validation error", description: "Treatment title is required.", variant: "destructive" });
      return;
    }

    if (statusDraft === "CLOSED") {
      if (!closureDateDraft) {
        toast({ title: "Validation error", description: "Closure date is required.", variant: "destructive" });
        return;
      }
      if (!closureNotesDraft.trim()) {
        toast({ title: "Validation error", description: "Closing notes are required.", variant: "destructive" });
        return;
      }
    }

    if (subTypeDraft && !typeDraft) {
      toast({ title: "Validation error", description: "Select a treatment type first.", variant: "destructive" });
      return;
    }

    updateTreatmentMutation.mutate(
      {
        patientId,
        treatmentId,
        data: {
          treatment_title: title,
          treatment_status: statusDraft,
          treatment_notes: notesDraft.trim() || null,
          treatment_type: typeDraft || null,
          treatment_sub_type: subTypeDraft || null,
          treatment_closure_date: statusDraft === "CLOSED" ? closureDateDraft : null,
          treatment_closure_notes: statusDraft === "CLOSED" ? closureNotesDraft.trim() : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Treatment updated." });
          setIsEditOpen(false);
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error?.message || "Failed to update treatment.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <BriefcaseMedical className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold text-slate-900">{treatment.treatment_title}</h2>
              <div className="flex items-center gap-4 mt-1">
                <Badge className={getStatusClass(status)}>
                  {status === "CLOSED" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                  {status}
                </Badge>
                <span className="text-slate-500 text-sm flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Started {startedOn}
                </span>
                {closedOn && (
                  <span className="text-slate-500 text-sm flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> Closed {closedOn}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              resetDrafts();
              setIsEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Treatment
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-slate-200 hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Patient Information</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <Link href={`/patients/${treatment.patient_id}`} className="text-2xl font-bold text-blue-600 hover:underline">
                {patientName}
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
              {treatment.primary_facility_id ? (
                <div className="text-2xl font-bold text-emerald-600">
                  {facilityName || "Unknown facility"}
                </div>
              ) : (
                <div className="text-2xl font-bold text-slate-300">Not linked</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Treatment Details & Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Treatment Type</p>
                <p className="text-slate-800">{treatment.treatment_type || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Treatment Sub Type</p>
                <p className="text-slate-800">{treatment.treatment_sub_type || "-"}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {treatment.treatment_notes || "No detailed notes provided for this treatment."}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Current Status</p>
                <Badge className={getStatusClass(status)}>{status}</Badge>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Closure Date</p>
                <p className="text-slate-800">{closedOn || "-"}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 p-4 bg-white">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Closing Notes</p>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {treatment.treatment_closure_notes || "No closing notes."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Treatment</DialogTitle>
            <DialogDescription>Update treatment details, notes, status, type and sub type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="treatment_title">Treatment Title *</Label>
              <Input
                id="treatment_title"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Treatment Type</Label>
                <Select
                  value={typeDraft || "none"}
                  onValueChange={(value) => {
                    const nextType = value === "none" ? "" : value;
                    setTypeDraft(nextType);
                    if (nextType) {
                      const nextOptions = getTreatmentSubTypes(nextType);
                      if (!nextOptions.includes(subTypeDraft)) setSubTypeDraft("");
                    } else {
                      setSubTypeDraft("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Object.keys(TREATMENT_TYPE_SUBTYPE_MAP).map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Treatment Sub Type</Label>
                <Select
                  value={subTypeDraft || "none"}
                  onValueChange={(value) => setSubTypeDraft(value === "none" ? "" : value)}
                  disabled={!typeDraft}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={typeDraft ? "Select sub type" : "Select type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subTypeOptions.map((subType) => (
                      <SelectItem key={subType} value={subType}>{subType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={statusDraft} onValueChange={(value) => setStatusDraft(normalizeStatus(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="HOLD">HOLD</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Treatment Notes</Label>
              <Textarea
                id="notes"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {statusDraft === "CLOSED" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="closure_date">Closure Date *</Label>
                  <Input
                    id="closure_date"
                    type="date"
                    value={closureDateDraft}
                    onChange={(e) => setClosureDateDraft(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closure_notes">Closing Notes *</Label>
                  <Textarea
                    id="closure_notes"
                    value={closureNotesDraft}
                    onChange={(e) => setClosureNotesDraft(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={updateTreatmentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSave}
                disabled={updateTreatmentMutation.isPending}
              >
                {updateTreatmentMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

