import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { 
  Building2, 
  Users, 
  FileCheck, 
  ArrowUpRight, 
  TrendingUp 
} from "lucide-react";
import { Link } from "wouter";
import { Layout } from "@/components/ui/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: facilities, isLoading: loadingFacilities } = useQuery({
    queryKey: [api.facilities.list.path],
    queryFn: async () => {
      const res = await fetch(api.facilities.list.path);
      if (!res.ok) throw new Error("Err");
      return res.json();
    }
  });

  const { data: patients, isLoading: loadingPatients } = useQuery({
    queryKey: [api.patients.list.path],
    queryFn: async () => {
      const res = await fetch(api.patients.list.path);
      if (!res.ok) throw new Error("Err");
      return res.json();
    }
  });

  const { data: acks, isLoading: loadingAcks } = useQuery({
    queryKey: [api.acknowledgments.list.path],
    queryFn: async () => {
      const res = await fetch(api.acknowledgments.list.path);
      if (!res.ok) throw new Error("Err");
      return res.json();
    }
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900">Dashboard Overview</h2>
          <p className="text-slate-500 mt-1">Welcome back. Here's what's happening today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Facilities Card */}
          <Link href="/facilities">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Building2 className="w-24 h-24 text-primary transform group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-700">Facilities</h3>
              </div>
              <div className="space-y-1">
                {loadingFacilities ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <p className="text-4xl font-bold text-slate-900">{facilities?.length || 0}</p>
                )}
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  Registered clinics & hospitals
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                </p>
              </div>
            </div>
          </Link>

          {/* Patients Card */}
          <Link href="/patients">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-500/20 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-24 h-24 text-emerald-500 transform group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-700">Patients</h3>
              </div>
              <div className="space-y-1">
                {loadingPatients ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <p className="text-4xl font-bold text-slate-900">{patients?.length || 0}</p>
                )}
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  Active patient records
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </p>
              </div>
            </div>
          </Link>

          {/* Acknowledgments Card */}
          <Link href="/acknowledgments">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-violet-500/20 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileCheck className="w-24 h-24 text-violet-500 transform group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-700">Acknowledgments</h3>
              </div>
              <div className="space-y-1">
                {loadingAcks ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <p className="text-4xl font-bold text-slate-900">{acks?.length || 0}</p>
                )}
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  Processed documents
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions or Recent Activity Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary/40" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">System updated successfully</p>
                      <p className="text-xs text-slate-500">2 hours ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white flex flex-col justify-center items-start shadow-xl shadow-primary/20">
            <h3 className="text-2xl font-display font-bold mb-2">Need Help?</h3>
            <p className="text-primary-foreground/90 mb-6">Contact support for assistance with managing your facility records.</p>
            <button className="bg-white text-primary px-6 py-2 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
