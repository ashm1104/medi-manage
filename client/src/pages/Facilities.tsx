import { Link } from "wouter";
import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useFacilities, useCreateFacility, useUpdateFacility, useDeleteFacility } from "@/hooks/use-facilities";
import { Plus, Search, Pencil, Trash2, Building2, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { InsertFacility, Facility } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Facilities() {
  const { data: facilities, isLoading } = useFacilities();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  const filteredFacilities = facilities?.filter(f => 
    f.facility_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.host_doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Facilities</h2>
            <p className="text-slate-500">Manage hospitals and clinics.</p>
          </div>
          <Button 
            onClick={() => { setEditingFacility(null); setIsDialogOpen(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Facility
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search facilities..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Host Doctor</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredFacilities?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No facilities found</p>
                    </td>
                  </tr>
                ) : (
                  filteredFacilities?.map((facility) => (
                    <tr key={facility.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link href={`/facilities/${facility.id}`} className="text-blue-600 hover:underline">
                          {facility.facility_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          facility.type === 'HOSPITAL' 
                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {facility.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {facility.host_doctor_name || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex flex-col gap-1 text-xs">
                          {facility.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {facility.address}
                            </div>
                          )}
                          {facility.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {facility.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-slate-200"
                            onClick={() => {
                              setEditingFacility(facility);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4 text-slate-600" />
                          </Button>
                          <DeleteButton id={facility.id} />
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

      <FacilityDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        initialData={editingFacility}
      />
    </Layout>
  );
}

function DeleteButton({ id }: { id: string }) {
  const { mutate, isPending } = useDeleteFacility();
  const { toast } = useToast();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
      disabled={isPending}
      onClick={() => {
        if (confirm("Are you sure you want to delete this facility?")) {
          mutate(id, {
            onSuccess: () => toast({ title: "Deleted", description: "Facility removed successfully." }),
            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" })
          });
        }
      }}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

function FacilityDialog({ 
  open, 
  onOpenChange, 
  initialData 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  initialData: Facility | null; 
}) {
  const { toast } = useToast();
  const createMutation = useCreateFacility();
  const updateMutation = useUpdateFacility();
  
  const isEditing = !!initialData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData);
    
    // Clean up empty strings
    if (!data.host_doctor_name) delete data.host_doctor_name;
    if (!data.address) delete data.address;
    if (!data.phone) delete data.phone;

    if (isEditing) {
      updateMutation.mutate({ id: initialData.id, ...data }, {
        onSuccess: () => {
          toast({ title: "Success", description: "Facility updated" });
          onOpenChange(false);
        }
      });
    } else {
      createMutation.mutate(data as InsertFacility, {
        onSuccess: () => {
          toast({ title: "Success", description: "Facility created" });
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Facility" : "Add Facility"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update facility details below." : "Enter the details for the new facility."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="facility_name">Facility Name *</Label>
            <Input 
              id="facility_name" 
              name="facility_name" 
              defaultValue={initialData?.facility_name} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select name="type" defaultValue={initialData?.type || "CLINIC"}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLINIC">Clinic</SelectItem>
                <SelectItem value="HOSPITAL">Hospital</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="host_doctor_name">Host Doctor</Label>
            <Input 
              id="host_doctor_name" 
              name="host_doctor_name" 
              defaultValue={initialData?.host_doctor_name || ""} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                name="phone" 
                defaultValue={initialData?.phone || ""} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                name="address" 
                defaultValue={initialData?.address || ""} 
              />
            </div>
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
