import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Facilities from "@/pages/Facilities";
import FacilityProfile from "@/pages/FacilityProfile";
import Patients from "@/pages/Patients";
import PatientProfile from "@/pages/PatientProfile";
import Cases from "@/pages/cases/index";
import CaseProfile from "@/pages/CaseProfile";
import Acknowledgments from "@/pages/Acknowledgments";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function PublicRoute({ component: Component, ...rest }: any) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">{() => <PublicRoute component={Login} />}</Route>
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <PrivateRoute component={Dashboard} />}
      </Route>
      <Route path="/dashboard">
        {() => <PrivateRoute component={Dashboard} />}
      </Route>
      <Route path="/facilities" component={() => <PrivateRoute component={Facilities} />} />
      <Route path="/facilities/:id" component={() => <PrivateRoute component={FacilityProfile} />} />
      <Route path="/patients" component={() => <PrivateRoute component={Patients} />} />
      <Route path="/patients/:id" component={() => <PrivateRoute component={PatientProfile} />} />
      <Route path="/cases" component={() => <PrivateRoute component={Cases} />} />
      <Route path="/cases/:id" component={() => <PrivateRoute component={CaseProfile} />} />
      <Route path="/acknowledgments" component={() => <PrivateRoute component={Acknowledgments} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
