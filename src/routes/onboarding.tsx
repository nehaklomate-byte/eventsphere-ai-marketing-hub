import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Store, UserCheck, Users2, User, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { DASHBOARD_PATH, type PrimaryRole } from "@/lib/auth-redirect";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose your workspace — EventSphere AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: prof } = await supabase.from("profiles").select("primary_role").eq("id", data.user.id).maybeSingle();
    if (prof?.primary_role) {
      const path = DASHBOARD_PATH[prof.primary_role as PrimaryRole] ?? "/";
      throw redirect({ to: path });
    }
    return { userId: data.user.id };
  },
  component: Onboarding,
});

const ROLES: { id: PrimaryRole; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "organization", title: "Organization", desc: "Corporates, agencies and event planning teams.", icon: Users2 },
  { id: "hall_owner", title: "Hall Owner", desc: "Banquet halls, lawns, resorts and convention centers.", icon: Building2 },
  { id: "vendor", title: "Vendor", desc: "Decorators, caterers, photographers, DJs and more.", icon: Store },
  { id: "worker", title: "Worker", desc: "Stewards, chefs, technicians and on-ground crew.", icon: UserCheck },
  { id: "customer", title: "Customer", desc: "Booking venues and services for personal events.", icon: User },
];

function Onboarding() {
  const { userId } = Route.useRouteContext() as { userId: string };
  const navigate = useNavigate();
  const [role, setRole] = useState<PrimaryRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!role) return;
    setSaving(true); setErr(null);
    const { error: pErr } = await supabase.from("profiles").update({ primary_role: role }).eq("id", userId);
    if (pErr) { setErr(pErr.message); setSaving(false); return; }
    await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    navigate({ to: DASHBOARD_PATH[role], replace: true } as never);
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-4 flex items-center justify-between">
          <Logo className="h-8" />
          <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 md:px-8 py-14">
        <div className="text-center max-w-xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Welcome — how will you use EventSphere?</h1>
          <p className="mt-2 text-muted-foreground">Pick your primary role to open the right workspace. You can add more roles later.</p>
        </div>
        {err && <div className="mt-6 mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{err}</div>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => {
            const active = role === r.id;
            return (
              <button key={r.id} type="button" onClick={() => setRole(r.id)}
                className={`text-left rounded-2xl border p-5 transition ${active ? "border-brand-violet shadow-glow bg-accent/40" : "border-border bg-card hover:border-brand-violet/40"}`}>
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${active ? "bg-gradient-brand text-white" : "bg-accent text-brand-violet"}`}>
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                  {active && <CheckCircle2 className="h-4 w-4 text-brand-violet" />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-10 flex justify-end">
          <button disabled={!role || saving} onClick={submit}
            className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-6 py-3 text-sm font-semibold disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Open my workspace <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
