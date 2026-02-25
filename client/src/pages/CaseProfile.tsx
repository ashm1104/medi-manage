import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { Layout } from "@/components/ui/Layout";
import { useCase, useUpdateCase } from "@/hooks/use-cases";
import {
  BriefcaseMedical, User, Building2, Calendar,
  CheckCircle2, Clock, FileText, Pencil,
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

type CaseStatus = "OPEN" | "HOLD" | "CLOSED";

function normalizeStatus(value: unknown): CaseStatus {
  const normalized = typeof value === "string" ? value.toUpperCase() : "OPEN";
  if (normalized === "HOLD") return "HOLD";
  if (normalized === "CLOSED") return "CLOSED";
  return "OPEN";
}

function getStatusClass(status: CaseStatus): string {
  if (status === "CLOSED") return "bg-emerald-600 text-white";
  if (status === "HOLD") return "bg-amber-500 text-white";
  return "bg-blue-600 text-white";
}

export default function CaseProfile() {
  const [, params] = useRoute("/cases/:id");
  const id = params?.id ?? "";
  const { data, isLoading } = useCase(id);
  const updateCaseMutation = useUpdateCase();
  const { toast } = useToast();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [caseTitleDraft, setCaseTitleDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<CaseStatus>("OPEN");
  const [notesDraft, setNotesDraft] = useState("");
  const [closureDateDraft, setClosureDateDraft] = useState("");
  const [closureNotesDraft, setClosureNotesDraft] = useState("");
  const caseResponse = data as any;
  const caseData = caseResponse?.case;
  const patient_name = caseResponse?.patient_name;
  const facility_name = caseResponse?.facility_name;

  const resetDrafts = () => {
    if (!caseData) return;
    setCaseTitleDraft(String(caseData.case_title ?? ""));
    setStatusDraft(normalizeStatus(caseData.status));
    setNotesDraft(String(caseData.notes ?? ""));
    setClosureDateDraft(String(caseData.closure_date ?? ""));
    setClosureNotesDraft(String(caseData.closure_notes ?? ""));
  };

  useEffect(() => {
    if (!caseData) return;
    resetDrafts();
  }, [
    caseData?.id,
    caseData?.case_title,
    caseData?.status,
    caseData?.notes,
    caseData?.closure_date,
    caseData?.closure_notes,
  ]);

  if (isLoading) return <Layout><Skeleton className="h-full w-full" /></Layout>;
  if (!data || !caseData) return <Layout>Case not found</Layout>;

  const status = normalizeStatus(caseData.status);
  const startedOn = format(new Date(caseData.start_date), "MMM d, yyyy");
  const closedOn = caseData.closure_date ? format(new Date(caseData.closure_date), "MMM d, yyyy") : null;

  const handleSaveCase = () => {
    const title = caseTitleDraft.trim();
    if (!title) {
      toast({ title: "Validation error", description: "Case title is required.", variant: "destructive" });
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

    const payload: any = {
      id: caseData.id,
      case_title: title,
      status: statusDraft,
      notes: notesDraft.trim() || null,
    };

    if (statusDraft === "CLOSED") {
      payload.closure_date = closureDateDraft;
      payload.closure_notes = closureNotesDraft.trim();
    } else {
      payload.closure_date = null;
      payload.closure_notes = null;
    }

    updateCaseMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Success", description: "Case updated." });
        setIsEditOpen(false);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.message || "Failed to update case.",
          variant: "destructive",
        });
      },
    });
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
              <h2 className="text-3xl font-display font-bold text-slate-900">{caseData.case_title}</h2>
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
            Edit Case
          </Button>
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
                    {facility_name || "Unknown facility"}
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
                {caseData.closure_notes || "No closing notes."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Case</DialogTitle>
            <DialogDescription>Update case details, notes, and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="case_title">Case Title *</Label>
              <Input
                id="case_title"
                value={caseTitleDraft}
                onChange={(e) => setCaseTitleDraft(e.target.value)}
              />
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
              <Label htmlFor="notes">Case Notes</Label>
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
                disabled={updateCaseMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSaveCase}
                disabled={updateCaseMutation.isPending}
              >
                {updateCaseMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
