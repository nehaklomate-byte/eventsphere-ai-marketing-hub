import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["c-prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("customer_preferences").select("*").eq("user_id", user!.id).maybeSingle()).data,
  });

  const [local, setLocal] = useState<{ theme: string; language: string; email_notifications: boolean; sms_notifications: boolean; push_notifications: boolean; marketing_opt_in: boolean } | null>(null);
  useEffect(() => { if (prefs) setLocal(prefs as never); }, [prefs]);

  async function savePrefs() {
    if (!local) return;
    const { error } = await supabase.from("customer_preferences").update(local).eq("user_id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Preferences saved");
    qc.invalidateQueries({ queryKey: ["c-prefs"] });
    // Apply theme
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", local.theme === "dark");
    }
  }

  async function changePassword() {
    if (pw.length < 8) return toast.error("Minimum 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated"); setPw("");
  }

  async function logoutEverywhere() {
    await supabase.auth.signOut({ scope: "global" });
    nav({ to: "/login", replace: true } as never);
  }

  if (!local) return <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <PageShell title="Settings" subtitle="Preferences, security and privacy.">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-base font-semibold">Appearance & language</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Select label="Theme" v={local.theme} on={(v) => setLocal({ ...local, theme: v })} options={["system","light","dark"]} />
          <Select label="Language" v={local.language} on={(v) => setLocal({ ...local, language: v })} options={["en","hi","mr"]} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-base font-semibold">Notifications</h3>
        <div className="mt-4 space-y-3">
          <Toggle label="Email notifications" v={local.email_notifications} on={(v) => setLocal({ ...local, email_notifications: v })} />
          <Toggle label="SMS notifications" v={local.sms_notifications} on={(v) => setLocal({ ...local, sms_notifications: v })} />
          <Toggle label="Push notifications" v={local.push_notifications} on={(v) => setLocal({ ...local, push_notifications: v })} />
          <Toggle label="Marketing & offers" v={local.marketing_opt_in} on={(v) => setLocal({ ...local, marketing_opt_in: v })} />
        </div>
        <button onClick={savePrefs} className="mt-5 rounded-full btn-brand btn-brand-hover px-5 py-2 text-sm font-semibold text-white">Save preferences</button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-base font-semibold">Security</h3>
        <div className="mt-4 max-w-md space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">Change password</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8)"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <button onClick={changePassword} disabled={busy} className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
          </button>
          <button onClick={logoutEverywhere} className="ml-2 inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent"><LogOut className="h-4 w-4" /> Logout everywhere</button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-base font-semibold">Privacy</h3>
        <p className="mt-1 text-sm text-muted-foreground">Your data is protected with row-level security — only you and platform admins for support can view your account.</p>
      </section>
    </PageShell>
  );
}

function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border p-3">
      <span className="text-sm">{label}</span>
      <button type="button" onClick={() => on(!v)} className={`relative h-6 w-11 rounded-full transition ${v ? "bg-brand-violet" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${v ? "left-5" : "left-0.5"}`} />
      </button>
    </label>
  );
}
function Select({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      <select value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
