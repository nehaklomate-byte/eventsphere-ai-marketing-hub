import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings as SettingsIcon, Percent, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccountSettingsSection } from "@/components/AccountSettingsSections";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — EventOrbit AI Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

type PlatformSettings = {
  id: string;
  commission_rate_venue: number;
  commission_rate_vendor: number;
  commission_rate_worker: number;
};

async function fetchPlatformSettings(): Promise<PlatformSettings | null> {
  const { data, error } = await supabase.from("platform_settings" as never).select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data as unknown as PlatformSettings | null;
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
        <SettingsIcon className="h-7 w-7 text-brand-violet" /> Settings
      </h1>

      <CommissionSection />

      <div>
        <h2 className="font-display text-xl font-semibold">Your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Personal settings for your own admin login, separate from platform-wide settings above.</p>
      </div>
      <AccountSettingsSection />
    </div>
  );
}

function CommissionSection() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["platform-settings"], queryFn: fetchPlatformSettings });
  const [form, setForm] = useState({ commission_rate_venue: 10, commission_rate_vendor: 10, commission_rate_worker: 10 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings) setForm(settings); }, [settings?.id]);

  async function save() {
    if (!settings) { toast.error("Platform settings row not found."); return; }
    for (const [key, val] of Object.entries(form)) {
      if (val < 0 || val > 100) { toast.error(`${key.replace("commission_rate_", "")} rate must be between 0 and 100.`); return; }
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("platform_settings" as never)
        .update({ ...form, updated_at: new Date().toISOString(), updated_by: userData.user?.id } as never)
        .eq("id" as never, settings.id as never).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Update was blocked — please refresh and try again.");
      toast.success("Commission rates updated");
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Percent className="h-5 w-5 text-brand-violet" /> Commission rates</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The percentage the platform keeps from each successful payment, per role. Applied automatically the moment a
        payment clears — takes effect on new payments only, not ones already settled.
      </p>
      {isLoading ? (
        <div className="mt-4 grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !settings ? (
        <p className="mt-4 text-sm text-rose-600">No platform_settings row found — run the setup migration first.</p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <RateField label="Venue bookings" value={form.commission_rate_venue} onChange={(v) => setForm((f) => ({ ...f, commission_rate_venue: v }))} />
            <RateField label="Vendor bookings" value={form.commission_rate_vendor} onChange={(v) => setForm((f) => ({ ...f, commission_rate_vendor: v }))} />
            <RateField label="Worker bookings" value={form.commission_rate_worker} onChange={(v) => setForm((f) => ({ ...f, commission_rate_worker: v }))} />
          </div>
          <button onClick={save} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold disabled:opacity-70">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save rates
          </button>
        </>
      )}
    </div>
  );
}

function RateField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="relative">
        <input type="number" min={0} max={100} step={0.5} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 pr-8 text-sm outline-none focus:border-brand-violet" />
        <Percent className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  );
}
