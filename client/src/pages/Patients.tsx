import { Link } from "wouter";
import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient } from "@/hooks/use-patients";
import { Plus, Search, Pencil, Trash2, Users, Phone, FileText } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { InsertPatient, Patient } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Patients() {
  const { data: patients, isLoading } = usePatients();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const filteredPatients = patients?.filter(p => 
    p.name_or_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Patients</h2>
            <p className="text-slate-500">Manage patient records and notes.</p>
          </div>
          <Button 
            onClick={() => { setEditingPatient(null); setIsDialogOpen(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search patients..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Name / Code</th>
                  <th className="px-6 py-4">Primary Facility</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Notes</th>
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
                      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredPatients?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No patients found</p>
                    </td>
                  </tr>
                ) : (
                  filteredPatients?.map((patient: any) => (
                    <tr key={patient.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link href={`/patients/${patient.id}`} className="text-blue-600 hover:underline">
                          {patient.name_or_code}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {patient.primary_facility ? (
                          <Link href={`/facilities/${patient.primary_facility.facility_id}`} className="text-blue-600 hover:underline">
                            {patient.primary_facility.facility_name}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {patient.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {patient.phone}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                        {patient.notes || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-slate-200"
                            onClick={() => {
                              setEditingPatient(patient);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4 text-slate-600" />
                          </Button>
                          <DeleteButton id={patient.id} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PatientDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        initialData={editingPatient}
      />
    </Layout>
  );
}

function DeleteButton({ id }: { id: number }) {
  const { mutate, isPending } = useDeletePatient();
  const { toast } = useToast();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
      disabled={isPending}
      onClick={() => {
        if (confirm("Are you sure you want to delete this patient?")) {
          mutate(id, {
            onSuccess: () => toast({ title: "Deleted", description: "Patient removed successfully." }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
          });
        }
      }}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

function PatientDialog({ 
  open, 
  onOpenChange, 
  initialData 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  initialData: Patient | null; 
}) {
  const { toast } = useToast();
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  
  const isEditing = !!initialData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData);
    
    if (!data.phone) delete data.phone;
    if (!data.notes) delete data.notes;

    if (isEditing) {
      updateMutation.mutate({ id: initialData.id, ...data }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Patient updated" });
          onOpenChange(false);
        }
      });
    } else {
      createMutation.mutate(data as InsertPatient, {
        onSuccess: () => {
          toast({ title: "Success", description: "Patient created" });
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Patient" : "Add Patient"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update patient details below." : "Enter patient information."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name_or_code">Name or Code *</Label>
            <Input 
              id="name_or_code" 
              name="name_or_code" 
              defaultValue={initialData?.name_or_code} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone" 
              name="phone" 
              defaultValue={initialData?.phone || ""} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              defaultValue={initialData?.notes || ""} 
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? "Saving..." : (isEditing ? "Update" : "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
