import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/ui/Layout";
import {
  getAckPdfViewUrl,
  useAcknowledgments,
  useCreateAcknowledgment,
  useDeleteAcknowledgment,
  useGenerateAckPdf,
  useLatestAcknowledgment,
} from "@/hooks/use-acknowledgments";
import { useCases } from "@/hooks/use-cases";
import { useFacilities } from "@/hooks/use-facilities";
import { usePatientFacilities, usePatients } from "@/hooks/use-patients";
import { Plus, Search, Trash2, FileCheck, DollarSign, Calculator } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { InsertAckDoc } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isValid } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export default function Acknowledgments() {
  const { data: acks, isLoading: loadingAcks } = useAcknowledgments();
  const { data: facilities } = useFacilities();
  const { data: patients } = usePatients();
  const facilitiesList = (facilities as any[] | undefined) ?? [];
  const patientsList = (patients as any[] | undefined) ?? [];

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getFacilityName = (id: string) => facilitiesList.find((f: any) => f.id === id)?.facility_name || "Unknown";
  const getPatientName = (id?: string | null) => patientsList.find((p: any) => p.id === id)?.name_or_code || "-";

  const ackItems = (acks as any[] | undefined)?.map((row) => row?.ack ?? row) ?? [];
  const filteredAcks = ackItems.filter((a: any) =>
    (a?.ack_no?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (a?.case_ref?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  );

  const formatAckDate = (value: unknown) => {
    const parsed = value instanceof Date ? value : new Date(String(value));
    return isValid(parsed) ? format(parsed, "MMM d, yyyy") : "-";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Acknowledgments</h2>
            <p className="text-slate-500">Track visit and payment records.</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Ack
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ACK No or Case Ref..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4">Ack No</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Facility</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Final</th>
                  <th className="px-6 py-4 text-right">Paid</th>
                  <th className="px-6 py-4 text-right">Bal</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingAcks ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                    </tr>
                  ))
                ) : filteredAcks?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No acknowledgments found</p>
                    </td>
                  </tr>
                ) : (
                  filteredAcks.map((ack: any) => {
                    const balance = ack.balance != null && Number.isFinite(Number(ack.balance))
                      ? Number(ack.balance)
                      : null;
                    return (
                      <tr key={ack.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-slate-900">{ack.ack_no}</td>
                        <td className="px-6 py-4 text-slate-600">{formatAckDate(ack.ack_date)}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          <Link href={`/facilities/${ack.facility_id}`} className="text-blue-600 hover:underline">
                            {getFacilityName(ack.facility_id)}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {ack.patient_id ? (
                            <Link href={`/patients/${ack.patient_id}`} className="text-blue-600 hover:underline">
                              {getPatientName(ack.patient_id)}
                            </Link>
                          ) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                            {ack.ack_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">{Number(ack.amount_final).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-green-600">{Number(ack.amount_paid).toFixed(2)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${balance != null && balance > 0 ? "text-red-500" : "text-slate-400"}`}>
                          {balance != null ? balance.toFixed(2) : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PdfActions ack={ack} />
                            <DeleteButton id={ack.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateAckDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        patients={patientsList}
      />
    </Layout>
  );
}

function PdfActions({ ack }: { ack: any }) {
  const { mutate: generatePdf, isPending } = useGenerateAckPdf();
  const { toast } = useToast();
  const viewUrl = getAckPdfViewUrl(ack.id);
  const hasPdf = !!ack.pdf_path;

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

  const handleGenerate = () => {
    generatePdf(ack.id, {
      onSuccess: () => {
        toast({ title: "PDF ready", description: "Acknowledgment PDF generated." });
        void openPdf();
      },
      onError: (e) => {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      },
    });
  };

  return (
    <>
      {hasPdf && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          onClick={openPdf}
        >
          View PDF
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20"
        disabled={isPending}
        onClick={handleGenerate}
      >
        {isPending ? "Generating..." : hasPdf ? "Regenerate" : "Generate PDF"}
      </Button>
    </>
  );
}

function DeleteButton({ id }: { id: string }) {
  const { mutate, isPending } = useDeleteAcknowledgment();
  const { toast } = useToast();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this record?")) {
          mutate(id, {
            onSuccess: () => toast({ title: "Deleted", description: "Record deleted." }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
          });
        }
      }}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

function CreateAckDialog({
  open,
  onOpenChange,
  patients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: any[];
}) {
  const { toast } = useToast();
  const { mutate, isPending } = useCreateAcknowledgment();
  const { data: casesData } = useCases();

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [ackType, setAckType] = useState("VISIT");
  const [ackDate, setAckDate] = useState(new Date().toISOString().split("T")[0]);
  const [caseRef, setCaseRef] = useState("");
  const [splitAgreed, setSplitAgreed] = useState("");
  const [notes, setNotes] = useState("");
  const [amountFinal, setAmountFinal] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const allCases = (casesData as any[] | undefined) ?? [];
  const patientCases = useMemo(() => {
    if (!selectedPatientId) return [];
    return allCases.filter((row: any) => String(row?.case?.patient_id) === String(selectedPatientId));
  }, [allCases, selectedPatientId]);

  const { data: mappedFacilities = [] } = usePatientFacilities(selectedPatientId);
  const { data: latestAckRaw } = useLatestAcknowledgment(selectedPatientId, selectedFacilityId);
  const latestAck = (latestAckRaw as any) ?? null;

  const sortedFacilities = useMemo(() => {
    return [...(mappedFacilities as any[])].sort((a, b) => {
      if (!!a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && !!b.is_primary) return 1;
      return String(a.facility_name || "").localeCompare(String(b.facility_name || ""));
    });
  }, [mappedFacilities]);

  useEffect(() => {
    if (!selectedPatientId) return;
    if (sortedFacilities.length === 1) {
      setSelectedFacilityId(String(sortedFacilities[0].id));
      return;
    }
    const primary = sortedFacilities.find((f) => f.is_primary);
    if (primary) setSelectedFacilityId(String(primary.id));
  }, [selectedPatientId, sortedFacilities]);

  useEffect(() => {
    if (!caseRef) return;
    const existsInPatientCases = patientCases.some((row: any) => String(row?.case?.id) === String(caseRef));
    if (!existsInPatientCases) {
      setCaseRef("");
    }
  }, [patientCases, caseRef]);

  useEffect(() => {
    if (!selectedPatientId || caseRef || patientCases.length === 0) return;
    const latestPatientCaseId = patientCases[0]?.case?.id;
    if (latestPatientCaseId) {
      setCaseRef(String(latestPatientCaseId));
    }
  }, [selectedPatientId, patientCases, caseRef]);

  useEffect(() => {
    if (!selectedFacilityId) {
      setAmountFinal("");
      setAmountPaid("");
      setSplitAgreed("");
      return;
    }

    if (!latestAck) {
      setAmountFinal("");
      setAmountPaid("");
      setSplitAgreed("");
      return;
    }

    setAmountFinal(latestAck.amount_final != null ? String(latestAck.amount_final) : "");
    setAmountPaid("");
    setSplitAgreed(latestAck.split_agreed != null ? String(latestAck.split_agreed) : "");
    if (!caseRef && latestAck.case_ref != null) {
      const latestCaseRef = String(latestAck.case_ref);
      const existsInPatientCases = patientCases.some((row: any) => String(row?.case?.id) === latestCaseRef);
      if (existsInPatientCases) {
        setCaseRef(latestCaseRef);
      }
    }
  }, [selectedFacilityId, latestAck, caseRef, patientCases]);

  const latestAckBalance = latestAck && Number.isFinite(Number(latestAck.balance))
    ? Number(latestAck.balance)
    : null;
  const lastPaidAmount = latestAck && Number.isFinite(Number(latestAck.amount_paid))
    ? Number(latestAck.amount_paid)
    : null;
  const balanceBase = latestAckBalance != null ? latestAckBalance : Number(amountFinal || 0);
  const balanceNumber = balanceBase - Number(amountPaid || 0);
  const balance = balanceNumber.toFixed(2);
  const lastPaidAmountDisplay = lastPaidAmount != null ? lastPaidAmount.toFixed(2) : null;

  const resetForm = () => {
    setSelectedPatientId("");
    setSelectedFacilityId("");
    setAckType("VISIT");
    setAckDate(new Date().toISOString().split("T")[0]);
    setCaseRef("");
    setSplitAgreed("");
    setNotes("");
    setAmountFinal("");
    setAmountPaid("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const final = Number(amountFinal);
    const paid = Number(amountPaid);

    if (!selectedPatientId) {
      toast({ title: "Validation error", description: "Please select a patient.", variant: "destructive" });
      return;
    }
    if (!selectedFacilityId) {
      toast({ title: "Validation error", description: "Please select a facility.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(final) || final < 0) {
      toast({ title: "Validation error", description: "Final amount must be >= 0.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      toast({ title: "Validation error", description: "Paid amount must be >= 0.", variant: "destructive" });
      return;
    }
    if (paid > balanceBase) {
      toast({
        title: "Validation error",
        description: latestAckBalance != null
          ? "Amount paid cannot exceed previous balance."
          : "Amount paid cannot exceed final amount.",
        variant: "destructive",
      });
      return;
    }

    const payload: InsertAckDoc = {
      ack_no: "",
      ack_type: ackType,
      facility_id: selectedFacilityId,
      patient_id: selectedPatientId,
      case_ref: caseRef || null,
      split_agreed: splitAgreed || null,
      ack_date: ackDate,
      amount_final: String(final),
      amount_paid: String(paid),
      balance: (balanceBase - paid).toFixed(2),
      visiting_doc_share: null,
      pdf_path: null,
      notes: notes || null,
    };

    mutate(payload, {
      onSuccess: () => {
        toast({ title: "Success", description: "Acknowledgment created." });
        onOpenChange(false);
        resetForm();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Acknowledgment</DialogTitle>
          <DialogDescription>Record a new visit or payment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient *</Label>
              <Select value={selectedPatientId} onValueChange={(value) => {
                setSelectedPatientId(value);
                setSelectedFacilityId("");
                setCaseRef("");
                setAmountFinal("");
                setAmountPaid("");
                setSplitAgreed("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name_or_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ack_type">Type *</Label>
              <Select value={ackType} onValueChange={setAckType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISIT">Visit</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ack_date">Date *</Label>
              <Input id="ack_date" type="date" required value={ackDate} onChange={(e) => setAckDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facility_id">Facility *</Label>
              <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId} disabled={!selectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedPatientId ? "Select Facility" : "Select patient first"} />
                </SelectTrigger>
                <SelectContent>
                  {sortedFacilities.map((f: any) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.facility_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="case_ref">Case Reference</Label>
              <Select
                value={caseRef || "none"}
                onValueChange={(value) => setCaseRef(value === "none" ? "" : value)}
                disabled={!selectedPatientId || patientCases.length === 0}
              >
                <SelectTrigger id="case_ref">
                  <SelectValue
                    placeholder={
                      !selectedPatientId
                        ? "Select patient first"
                        : patientCases.length === 0
                          ? "No cases for this patient"
                          : "Select case"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {patientCases.map((row: any) => (
                    <SelectItem key={String(row.case.id)} value={String(row.case.id)}>
                      {row.case.case_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="split_agreed">Split Agreed</Label>
              <Input id="split_agreed" placeholder="e.g. 60/40" value={splitAgreed} onChange={(e) => setSplitAgreed(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Last Paid Amount</Label>
            <div className="h-10 w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 flex items-center">
              {lastPaidAmountDisplay ?? "-"}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_final">Final Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="amount_final"
                  type="number"
                  step="0.01"
                  className="pl-9 bg-white"
                  required
                  value={amountFinal}
                  onChange={(e) => setAmountFinal(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid *</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  className="pl-9 bg-white"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Balance</Label>
              <div className="relative">
                <Calculator className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <div className="h-10 w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700 flex items-center">
                  {balance}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Additional details..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? "Creating..." : "Create Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
