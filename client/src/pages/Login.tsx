import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Stethoscope, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toReadableAuthError = (message: string) => {
    if (message.toLowerCase().includes("failed to fetch")) {
      return "Could not reach Supabase Auth. Check internet, browser privacy/extension blocking, and Render VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY values.";
    }
    return message;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: toReadableAuthError(error.message),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description:
          error instanceof Error
            ? toReadableAuthError(error.message)
            : "Unexpected error during login.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: toReadableAuthError(error.message),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account Created",
        description: "Please check your email to verify your account, or login if auto-confirmed.",
      });
    } catch (error) {
      toast({
        title: "Signup Failed",
        description:
          error instanceof Error
            ? toReadableAuthError(error.message)
            : "Unexpected error during signup.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-y-1/2"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900">Welcome Back</h1>
            <p className="text-slate-500">Sign in to access your medical dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-200 hover:bg-slate-50 text-slate-600"
            onClick={handleSignUp}
            disabled={loading}
          >
            Create new account
          </Button>
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; 2024 MediManage System. Secure & Compliant.
        </p>
      </div>
    </div>
  );
}
