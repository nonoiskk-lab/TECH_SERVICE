"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Laptop2, ShieldCheck, Wrench, MessageCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@repairflow.demo", password: "Admin@123" },
  { role: "Service Manager", email: "manager@repairflow.demo", password: "Manager@123" },
  { role: "Technician", email: "tech@repairflow.demo", password: "Tech@123" },
  { role: "Front Desk", email: "frontdesk@repairflow.demo", password: "Front@123" },
];

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showDemo, setShowDemo] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not sign in.");
        return;
      }
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-950 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative flex items-center gap-2 text-lg font-bold">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <Laptop2 className="size-5" />
          </div>
          RepairFlow
        </div>
        <div className="relative max-w-md space-y-8">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            The operating system for your laptop service center.
          </h1>
          <p className="text-primary-100">
            Every customer, device, repair, part and payment — connected in one place, with your
            customers kept updated on WhatsApp automatically.
          </p>
          <div className="space-y-4">
            {[
              { icon: Wrench, text: "Track every job from intake to delivery" },
              { icon: MessageCircle, text: "Notify customers on WhatsApp with one click" },
              { icon: ShieldCheck, text: "Role-based access for your whole team" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-primary-50">
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-primary-200">
          © {new Date().getFullYear()} RepairFlow. Built for laptop &amp; computer service centers.
        </p>
      </div>

      <div className="flex items-center justify-center bg-[var(--color-bg)] p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-bold text-ink-900 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Laptop2 className="size-5" />
            </div>
            RepairFlow
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">Access your service center dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@repairflow.demo"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-white">
            <button
              type="button"
              onClick={() => setShowDemo((s) => !s)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink-700"
            >
              Demo credentials (dev only)
              <ChevronDown className={`size-4 transition-transform ${showDemo ? "rotate-180" : ""}`} />
            </button>
            {showDemo && (
              <div className="space-y-2 border-t border-[var(--color-border)] p-4 text-xs">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(a.password);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-ink-50"
                  >
                    <span className="font-semibold text-ink-700">{a.role}</span>
                    <span className="font-mono text-ink-500">{a.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
