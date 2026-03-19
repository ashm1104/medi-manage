import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { 
  Building2, 
  Users, 
  FileCheck, 
  ArrowUpRight, 
  TrendingUp,
  Clock,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { Layout } from "@/components/ui/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: facilities, isLoading: loadingFacilities } = useQuery({
    queryKey: [api.facilities.list.path],
  });

  const { data: patients, isLoading: loadingPatients } = useQuery({
    queryKey: [api.patients.list.path],
  });

  const { data: acks, isLoading: loadingAcks } = useQuery({
    queryKey: [api.acknowledgments.list.path],
  });
  const facilityList = (facilities as any[] | undefined) ?? [];
  const patientList = (patients as any[] | undefined) ?? [];
  const ackList = (acks as any[] | undefined) ?? [];

  const stats = [
    {
      label: "Total Facilities",
      value: facilityList.length,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/facilities"
    },
    {
      label: "Active Patients",
      value: patientList.length,
      icon: Users,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      href: "/patients"
    },
    {
      label: "Acknowledgments",
      value: ackList.length,
      icon: FileCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/acknowledgments"
    }
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover-elevate cursor-pointer border-slate-200 group transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</CardTitle>
                  <div className={`p-2 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-bold text-slate-900">
                        {loadingFacilities || loadingPatients || loadingAcks ? (
                          <Skeleton className="h-9 w-12" />
                        ) : (
                          stat.value
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="border-slate-200 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Recent Acknowledgments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {loadingAcks ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))
                ) : ackList.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    No recent activity
                  </div>
                ) : (
                  ackList.slice(0, 5).map((ack: any) => (
                    <div key={ack.ack.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {ack.ack.ack_no.substring(ack.ack.ack_no.length - 4)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{ack.patient_name}</p>
                          <p className="text-xs text-slate-500">{ack.facility_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">${Number(ack.ack.amount_final).toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{new Date(ack.ack.ack_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-slate-200 rounded-2xl p-6 bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <TrendingUp className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-6">
              <div>
                <h3 className="text-xl font-bold">Quick Actions</h3>
                <p className="text-slate-400 text-sm">Efficiently manage your workflow.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/facilities">
                  <Button className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-white" variant="outline">
                    Add Facility
                  </Button>
                </Link>
                <Link href="/patients">
                  <Button className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-white" variant="outline">
                    Register Patient
                  </Button>
                </Link>
                <Link href="/acknowledgments">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 border-none text-white col-span-2 shadow-lg shadow-blue-900/20">
                    New Acknowledgment
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
