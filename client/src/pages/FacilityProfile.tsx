import { useRoute } from "wouter";
import { useEffect, useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useFacility, useUpdateFacility } from "@/hooks/use-facilities";
import { 
  Building2, Users, FileText, BriefcaseMedical, 
  MapPin, Phone, User, Pencil
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";

export default function FacilityProfile() {
  const [, params] = useRoute("/facilities/:id");
  const id = params?.id ?? "";
  const { data, isLoading } = useFacility(id);
  const updateFacility = useUpdateFacility();
  const { toast } = useToast();
  const [isEditingLocationContact, setIsEditingLocationContact] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  useEffect(() => {
    if (!data?.facility) return;
    setAddressInput(data.facility.address || "");
    setPhoneInput(data.facility.phone || "");
  }, [data?.facility?.id, data?.facility?.address, data?.facility?.phone]);

  if (isLoading) return <Layout><Skeleton className="h-full w-full" /></Layout>;
  if (!data) return <Layout>Facility not found</Layout>;

  const { facility, patients: linkedPatients, acknowledgments } = data;
  const treatments = (data.treatments ?? data.cases ?? []) as any[];

  const handleStartEditingLocationContact = () => {
    setAddressInput(facility.address || "");
    setPhoneInput(facility.phone || "");
    setIsEditingLocationContact(true);
  };

  const handleCancelEditingLocationContact = () => {
    setAddressInput(facility.address || "");
    setPhoneInput(facility.phone || "");
    setIsEditingLocationContact(false);
  };

  const handleSaveLocationContact = () => {
    updateFacility.mutate(
      {
        id: facility.id,
        address: addressInput.trim(),
        phone: phoneInput.trim(),
      },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Location and contact details updated." });
          setIsEditingLocationContact(false);
        },
        onError: (e) => {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900">{facility.facility_name}</h2>
            <div className="flex items-center gap-4 mt-1 text-slate-500">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">{facility.type}</Badge>
              <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {facility.host_doctor_name || "No host doctor"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" /> Linked Patients
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {linkedPatients.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No patients linked to this facility</div>
                  ) : (
                    linkedPatients.map((p: any) => (
                      <Link key={p.id} href={`/patients/${p.id}`}>
                        <div className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between">
                          <div className="font-medium text-slate-900">{p.name_or_code}</div>
                          {p.is_primary && <Badge className="bg-emerald-100 text-emerald-700">Primary</Badge>}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-600" /> Recent Activity
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
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" /> Location & Contact
                </CardTitle>
                {!isEditingLocationContact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-slate-600"
                    onClick={handleStartEditingLocationContact}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {isEditingLocationContact ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="facility-profile-address">Address</Label>
                      <Input
                        id="facility-profile-address"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        placeholder="Enter address"
                        disabled={updateFacility.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facility-profile-phone">Phone</Label>
                      <Input
                        id="facility-profile-phone"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Enter contact number"
                        disabled={updateFacility.isPending}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEditingLocationContact}
                        disabled={updateFacility.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="btn-primary"
                        onClick={handleSaveLocationContact}
                        disabled={updateFacility.isPending}
                      >
                        {updateFacility.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
                      <span className="text-slate-600 text-sm">{facility.address || "No address provided"}</span>
                    </div>
                    <div className="flex gap-3">
                      <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                      <span className="text-slate-600 text-sm">{facility.phone || "No contact number"}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BriefcaseMedical className="h-5 w-5 text-emerald-600" /> Active Treatments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {treatments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No active treatments</div>
                  ) : (
                    treatments.map((c: any) => (
                      <div key={c.id} className="p-4 bg-white">
                        <div className="font-medium text-slate-900 text-sm">{c.case_title}</div>
                        <div className="text-xs text-slate-500 mt-1">{format(new Date(c.start_date), "MMM d, yyyy")}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function History({ className }: { className?: string }) {
  return <FileText className={className} />;
}
