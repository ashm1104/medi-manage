import { useRoute } from "wouter";
import { Layout } from "@/components/ui/Layout";
import { usePatient, useLinkFacility, useUpdatePatient } from "@/hooks/use-patients";
import { useFacilities } from "@/hooks/use-facilities";
import { useCreatePatientTreatment, usePatientTreatments } from "@/hooks/use-treatments";
import {
  getAckPdfViewUrl,
  useGeneratePatientHistoryPdf,
} from "@/hooks/use-acknowledgments";
import {
  User, Phone, Building2, Plus, History, BriefcaseMedical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format, isValid } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTreatmentSubTypes, TREATMENT_TYPE_SUBTYPE_MAP } from "@shared/treatments";

export default function PatientProfile() {
  const [, params] = useRoute("/patients/:id");
  const id = params?.id ?? "";
  const { data: rawData, isLoading } = usePatient(id);
  const data = (rawData as any) ?? null;
  const { data: allFacilities } = useFacilities();
  const { data: treatmentRowsRaw } = usePatientTreatments(id);
  const allFacilitiesList = (allFacilities as any[] | undefined) ?? [];
  const treatmentRows = (treatmentRowsRaw as any[] | undefined) ?? [];
  const linkMutation = useLinkFacility();
  const createTreatmentMutation = useCreatePatientTreatment();
  const { mutate: generateHistoryPdf, isPending: isGeneratingHistoryPdf } = useGeneratePatientHistoryPdf();
  const updatePatientMutation = useUpdatePatient();
  const { toast } = useToast();

  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [isTreatmentDialogOpen, setIsTreatmentDialogOpen] = useState(false);
  const [treatmentTitle, setTreatmentTitle] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [treatmentSubType, setTreatmentSubType] = useState("");
  const [treatmentFacilityId, setTreatmentFacilityId] = useState("none");
  const [treatmentStartDate, setTreatmentStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const treatmentSubTypeOptions = useMemo(() => getTreatmentSubTypes(treatmentType), [treatmentType]);
  const patient = data?.patient;
  const linkedFacilitiesList = (data?.facilities as any[] | undefined) ?? [];
  const acknowledgments = data?.acknowledgments ?? [];
  const uniqueLinkedFacilities = useMemo(() => {
    const byId = new Map<string, any>();
    for (const row of linkedFacilitiesList) {
      const key = String(row.id);
      const existing = byId.get(key);
      if (!existing) {
        byId.set(key, { ...row });
        continue;
      }
      if (!existing.is_primary && row.is_primary) {
        byId.set(key, { ...existing, is_primary: true });
      }
    }
    return Array.from(byId.values());
  }, [linkedFacilitiesList]);
  const linkedFacilityIdSet = useMemo(() => {
    return new Set(uniqueLinkedFacilities.map((row: any) => String(row.id)));
  }, [uniqueLinkedFacilities]);
  const linkableFacilities = useMemo(() => {
    return allFacilitiesList.filter((f: any) => !linkedFacilityIdSet.has(String(f.id)));
  }, [allFacilitiesList, linkedFacilityIdSet]);
  const ackRows = (acknowledgments || []).map((row: any) => ({
    ...row.ack,
    facility_name: row.facility_name,
  }));

  useEffect(() => {
    setNotesDraft(String(patient?.notes || ""));
  }, [patient?.notes]);

  if (isLoading) return <Layout><Skeleton className="h-full w-full" /></Layout>;
  if (!data || !patient) return <Layout>Patient not found</Layout>;

  const getVisitShareForRow = (ack: any) => {
    const splitText = String(ack.split_agreed || "").trim();
    const match = splitText.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
    if (!match) return ack.visiting_doc_share || "-";

    const visitPct = Number(match[2]);
    const paid = Number(ack.amount_paid);
    if (!Number.isFinite(visitPct) || !Number.isFinite(paid)) return ack.visiting_doc_share || "-";

    const share = Math.round((paid * (visitPct / 100) + Number.EPSILON) * 100) / 100;
    return share.toFixed(2);
  };

  const formatAckDate = (value: unknown) => {
    const parsed = value instanceof Date ? value : new Date(String(value));
    return isValid(parsed) ? format(parsed, "MMM d, yyyy") : "-";
  };

  const handleLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;
    if (linkedFacilityIdSet.has(String(selectedFacility))) {
      toast({ title: "Already linked", description: "This facility is already linked to the patient.", variant: "destructive" });
      return;
    }

    linkMutation.mutate({
      patientId: id,
      data: { facility_id: selectedFacility, is_primary: isPrimary },
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Facility linked successfully" });
        setSelectedFacility("");
        setIsPrimary(false);
      },
    });
  };

  const handleSetPrimaryFacility = (facilityId: string) => {
    linkMutation.mutate({
      patientId: id,
      data: { facility_id: facilityId, is_primary: true },
    }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Primary facility updated." });
      },
      onError: (e) => {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      },
    });
  };

  const handleCancelNotes = () => {
    setNotesDraft(String(patient?.notes || ""));
    setIsEditingNotes(false);
  };

  const handleSaveNotes = () => {
    updatePatientMutation.mutate(
      { id, notes: notesDraft.trim() || null },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Notes updated." });
          setIsEditingNotes(false);
        },
        onError: (e) => {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        },
      },
    );
  };

  const resetTreatmentForm = () => {
    setTreatmentTitle("");
    setTreatmentType("");
    setTreatmentSubType("");
    setTreatmentFacilityId("none");
    setTreatmentStartDate(new Date().toISOString().split("T")[0]);
    setTreatmentNotes("");
  };

  const handleCreateTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatmentTitle.trim()) {
      toast({ title: "Validation error", description: "Treatment title is required.", variant: "destructive" });
      return;
    }
    if (!treatmentStartDate) {
      toast({ title: "Validation error", description: "Start date is required.", variant: "destructive" });
      return;
    }
    if (treatmentSubType && !treatmentType) {
      toast({ title: "Validation error", description: "Select treatment type first.", variant: "destructive" });
      return;
    }

    createTreatmentMutation.mutate(
      {
        patientId: id,
        data: {
          treatment_title: treatmentTitle.trim(),
          treatment_type: treatmentType || null,
          treatment_sub_type: treatmentSubType || null,
          treatment_start_date: treatmentStartDate,
          treatment_notes: treatmentNotes.trim() || null,
          primary_facility_id: treatmentFacilityId === "none" ? null : treatmentFacilityId,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Treatment created." });
          setIsTreatmentDialogOpen(false);
          resetTreatmentForm();
        },
        onError: (e) => {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        },
      },
    );
  };

  const openBlobInNewTab = (blob: Blob) => {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const handleGenerateHistoryPdf = () => {
    generateHistoryPdf(id, {
      onSuccess: (blob) => {
        toast({ title: "PDF ready", description: "Full payment history PDF generated." });
        openBlobInNewTab(blob);
      },
      onError: (e) => {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      },
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
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" /> Acknowledgment History
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isGeneratingHistoryPdf || ackRows.length === 0}
                  onClick={handleGenerateHistoryPdf}
                >
                  {isGeneratingHistoryPdf ? "Generating..." : "Generate PDF"}
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-4 py-3 text-left">Ack No</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Facility</th>
                      <th className="px-4 py-3 text-right">Final</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-left">Split</th>
                      <th className="px-4 py-3 text-right">Visit Share</th>
                      <th className="px-4 py-3 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ackRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-slate-400">No records found</td>
                      </tr>
                    ) : (
                      ackRows.map((ack: any) => {
                        const balance = ack.balance != null && Number.isFinite(Number(ack.balance))
                          ? Number(ack.balance)
                          : null;
                        return (
                          <tr key={ack.id}>
                            <td className="px-4 py-4 font-mono">{ack.ack_no}</td>
                            <td className="px-4 py-4">{formatAckDate(ack.ack_date)}</td>
                            <td className="px-4 py-4">{ack.facility_name || "-"}</td>
                            <td className="px-4 py-4 text-right">{Number(ack.amount_final).toFixed(2)}</td>
                            <td className="px-4 py-4 text-right">{Number(ack.amount_paid).toFixed(2)}</td>
                            <td className="px-4 py-4 text-right">{balance != null ? balance.toFixed(2) : "-"}</td>
                            <td className="px-4 py-4">{ack.split_agreed || "-"}</td>
                            <td className="px-4 py-4 text-right">{getVisitShareForRow(ack)}</td>
                            <td className="px-4 py-4 text-right">
                              <AckPdfActions ack={ack} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BriefcaseMedical className="h-5 w-5 text-blue-600" /> Treatments
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setIsTreatmentDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Treatment
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {treatmentRows.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No treatments recorded</div>
                  ) : (
                    treatmentRows.map((row: any) => (
                      <Link key={row.treatment.id} href={`/patients/${id}/treatments/${row.treatment.id}`}>
                        <div className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-900">{row.treatment.treatment_title}</div>
                            <div className="text-xs text-slate-500">
                              Started: {format(new Date(row.treatment.treatment_start_date), "MMM d, yyyy")}
                            </div>
                            {(row.treatment.treatment_type || row.treatment.treatment_sub_type) && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {[row.treatment.treatment_type, row.treatment.treatment_sub_type]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </div>
                            )}
                          </div>
                          <Badge
                            className={
                              row.treatment.treatment_status === "OPEN"
                                ? "bg-blue-600 text-white"
                                : row.treatment.treatment_status === "HOLD"
                                  ? "bg-amber-500 text-white"
                                  : "bg-emerald-600 text-white"
                            }
                          >
                            {row.treatment.treatment_status}
                          </Badge>
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
                  {uniqueLinkedFacilities.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <Link href={`/facilities/${f.id}`} className="font-medium text-blue-600 hover:underline">
                        {f.facility_name}
                      </Link>
                      {f.is_primary ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Primary</Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={linkMutation.isPending}
                          onClick={() => handleSetPrimaryFacility(String(f.id))}
                        >
                          Set Primary
                        </Button>
                      )}
                    </div>
                  ))}

                  {linkableFacilities.length > 0 && (
                    <form onSubmit={handleLink} className="space-y-3 pt-4 border-t border-slate-100">
                      <Label className="text-xs uppercase tracking-wider text-slate-400">Link New Facility</Label>
                      <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select facility" />
                        </SelectTrigger>
                        <SelectContent>
                          {linkableFacilities.map((f: any) => (
                            <SelectItem key={f.id} value={String(f.id)}>{f.facility_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Checkbox id="primary" checked={isPrimary} onCheckedChange={(v) => setIsPrimary(!!v)} />
                        <Label htmlFor="primary" className="text-sm">Set as primary facility</Label>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={linkMutation.isPending || !selectedFacility}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Link Facility
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-slate-900 text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Notes</CardTitle>
                {!isEditingNotes ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 bg-transparent text-white hover:bg-slate-800"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 bg-transparent text-white hover:bg-slate-800"
                      onClick={handleCancelNotes}
                      disabled={updatePatientMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleSaveNotes}
                      disabled={updatePatientMutation.isPending}
                    >
                      {updatePatientMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isEditingNotes ? (
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={4}
                    className="resize-none border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-400"
                    placeholder="Add patient notes..."
                  />
                ) : (
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{patient.notes || "No notes available for this patient."}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isTreatmentDialogOpen} onOpenChange={setIsTreatmentDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Treatment</DialogTitle>
            <DialogDescription>Create a treatment record for this patient.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTreatment} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="treatment-title">Treatment Title *</Label>
              <Input
                id="treatment-title"
                value={treatmentTitle}
                onChange={(e) => setTreatmentTitle(e.target.value)}
                placeholder="e.g. Knee pain follow-up"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Treatment Type</Label>
                <Select
                  value={treatmentType || "none"}
                  onValueChange={(value) => {
                    const nextType = value === "none" ? "" : value;
                    setTreatmentType(nextType);
                    if (nextType) {
                      const options = getTreatmentSubTypes(nextType);
                      if (!options.includes(treatmentSubType)) setTreatmentSubType("");
                    } else {
                      setTreatmentSubType("");
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
                  value={treatmentSubType || "none"}
                  onValueChange={(value) => setTreatmentSubType(value === "none" ? "" : value)}
                  disabled={!treatmentType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={treatmentType ? "Select sub type" : "Select type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {treatmentSubTypeOptions.map((subType) => (
                      <SelectItem key={subType} value={subType}>{subType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="treatment-facility">Facility</Label>
                <Select value={treatmentFacilityId} onValueChange={setTreatmentFacilityId}>
                  <SelectTrigger id="treatment-facility">
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {uniqueLinkedFacilities.map((facility: any) => (
                      <SelectItem key={facility.id} value={String(facility.id)}>
                        {facility.facility_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatment-start-date">Start Date *</Label>
                <Input
                  id="treatment-start-date"
                  type="date"
                  value={treatmentStartDate}
                  onChange={(e) => setTreatmentStartDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment-notes">Treatment Notes</Label>
              <Textarea
                id="treatment-notes"
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTreatmentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={createTreatmentMutation.isPending}>
                {createTreatmentMutation.isPending ? "Creating..." : "Create Treatment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function AckPdfActions({ ack }: { ack: any }) {
  const { toast } = useToast();
  const viewUrl = getAckPdfViewUrl(ack.id);

  const openPdf = async () => {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    try {
      const res = await apiRequest("GET", viewUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (popup) {
        popup.location.href = blobUrl;
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e: any) {
      if (popup) popup.close();
      toast({
        title: "Error",
        description: e?.message || "Failed to open PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-end">
      <Button size="sm" variant="outline" onClick={() => void openPdf()}>
        View PDF
      </Button>
    </div>
  );
}
