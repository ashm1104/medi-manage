import { Link } from "wouter";
import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useAcknowledgments, useCreateAcknowledgment, useDeleteAcknowledgment } from "@/hooks/use-acknowledgments";
import { useFacilities } from "@/hooks/use-facilities";
import { usePatients } from "@/hooks/use-patients";
import { Plus, Search, Trash2, FileCheck, FileText, Calendar, DollarSign, Calculator } from "lucide-react";
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
import { format } from "date-fns";

export default function Acknowledgments() {
  const { data: acks, isLoading: loadingAcks } = useAcknowledgments();
  const { data: facilities } = useFacilities();
  const { data: patients } = usePatients();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredAcks = acks?.filter(a => 
    a.ack_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.case_ref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFacilityName = (id: number) => facilities?.find(f => f.id === id)?.facility_name || "Unknown";
  const getPatientName = (id?: number | null) => patients?.find(p => p.id === id)?.name_or_code || "-";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Acknowledgments</h2>
            <p className="text-slate-500">Track visit and payment records.</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="btn-primary"
          >
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
                  filteredAcks?.map((ack) => {
                    const balance = Number(ack.amount_final) - Number(ack.amount_paid);
                    return (
                      <tr key={ack.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                          {ack.ack_no}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {format(new Date(ack.ack_date), "MMM d, yyyy")}
                        </td>
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
                        <td className="px-6 py-4 text-right font-medium text-slate-900">
                          {Number(ack.amount_final).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-green-600">
                          {Number(ack.amount_paid).toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${balance > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {balance.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 text-xs bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20"
                              onClick={() => alert("PDF Generation logic pending...")}
                            >
                              PDF
                            </Button>
                            <DeleteButton id={ack.id} />
                          </div>
                        </td>
                      </tr>
                    )
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
        facilities={facilities || []}
        patients={patients || []}
      />
    </Layout>
  );
}

function DeleteButton({ id }: { id: number }) {
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
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
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
  facilities,
  patients
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  facilities: any[];
  patients: any[];
}) {
  const { toast } = useToast();
  const { mutate, isPending } = useCreateAcknowledgment();
  const [amountFinal, setAmountFinal] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState<string>("");

  const balance = (Number(amountFinal || 0) - Number(amountPaid || 0)).toFixed(2);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData);
    
    // Coercion and cleanup
    if (data.facility_id) data.facility_id = Number(data.facility_id);
    if (data.patient_id) {
      data.patient_id = Number(data.patient_id);
    } else {
      delete data.patient_id;
    }
    
    // Ensure numbers are strings for numeric/decimal db types if needed, 
    // or numbers if schema expects numbers. Zod coerce handles it usually, 
    // but schema says `numeric` which often comes back as string from DB, 
    // but input schema usually handles number or string. 
    // Our schema defines them as numeric, insertSchema usually expects number or string.
    
    mutate(data as InsertAckDoc, {
      onSuccess: () => {
        toast({ title: "Success", description: "Acknowledgment created" });
        onOpenChange(false);
        setAmountFinal("");
        setAmountPaid("");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Acknowledgment</DialogTitle>
          <DialogDescription>
            Record a new visit or payment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ack_type">Type *</Label>
              <Select name="ack_type" required defaultValue="VISIT">
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
              <Input 
                id="ack_date" 
                name="ack_date" 
                type="date" 
                required 
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facility_id">Facility *</Label>
              <Select name="facility_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.facility_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient_id">Patient</Label>
              <Select name="patient_id">
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name_or_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="case_ref">Case Reference</Label>
              <Input id="case_ref" name="case_ref" placeholder="e.g. #CASE-123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="split_agreed">Split Agreed</Label>
              <Input id="split_agreed" name="split_agreed" placeholder="e.g. 60/40" />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_final">Final Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  id="amount_final" 
                  name="amount_final" 
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
                  name="amount_paid" 
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
            <Textarea id="notes" name="notes" placeholder="Additional details..." rows={2} />
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
