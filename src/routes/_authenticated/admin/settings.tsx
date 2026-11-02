import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings as SettingsIcon, Percent, Save, Loader2, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccountSettingsSection } from "@/components/AccountSettingsSections";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — EventOrbit Nova Admin" }, { name: "robots", content: "noindex" }] }),
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

      <PricingSection />

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

  useEffect(() => {
    if (settings) setForm({ commission_rate_venue: settings.commission_rate_venue, commission_rate_vendor: settings.commission_rate_vendor, commission_rate_worker: settings.commission_rate_worker });
  }, [settings?.id]);

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

const PRICE_FIELDS: { group: string; fields: { key: string; label: string }[] }[] = [
  { group: "Subscription — Venue", fields: [
    { key: "subscription_venue_monthly", label: "Monthly" }, { key: "subscription_venue_6month", label: "6 months" }, { key: "subscription_venue_annual", label: "Annual" } ] },
  { group: "Subscription — Vendor", fields: [
    { key: "subscription_vendor_monthly", label: "Monthly" }, { key: "subscription_vendor_6month", label: "6 months" }, { key: "subscription_vendor_annual", label: "Annual" } ] },
  { group: "Subscription — Worker", fields: [
    { key: "subscription_worker_monthly", label: "Monthly" }, { key: "subscription_worker_6month", label: "6 months" }, { key: "subscription_worker_annual", label: "Annual" } ] },
  { group: "Public profile link — one-time activation fee", fields: [
    { key: "profile_anchor_fee_venue", label: "Venue" }, { key: "profile_anchor_fee_vendor", label: "Vendor" },
    { key: "profile_anchor_fee_agency_worker", label: "Agency worker" }, { key: "profile_anchor_fee_individual_worker", label: "Individual worker" } ] },
];

function PricingSection() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["platform-settings"], queryFn: fetchPlatformSettings });
  const [form, setForm] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const row = settings as unknown as Record<string, unknown>;
    const next: Record<string, number> = {};
    PRICE_FIELDS.forEach((g) => g.fields.forEach((f) => { next[f.key] = Number(row[f.key] ?? 0); }));
    setForm(next);
  }, [settings?.id]);

  async function save() {
    if (!settings) { toast.error("Platform settings row not found."); return; }
    for (const [key, val] of Object.entries(form)) {
      if (!Number.isFinite(val) || val < 0) { toast.error(`${key.replace(/_/g, " ")} must be 0 or more.`); return; }
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("platform_settings" as never)
        .update({ ...form, updated_at: new Date().toISOString(), updated_by: userData.user?.id } as never)
        .eq("id" as never, settings.id as never).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Update was blocked — please refresh and try again.");
      toast.success("Prices updated");
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><IndianRupee className="h-5 w-5 text-brand-violet" /> Subscription &amp; activation prices</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Profiles are shown on the marketplace only while their subscription is active. The first subscription is the
        monthly price and gives 2 months (1 month free + 1 paid); after that any plan can be chosen. New prices apply to new payments only.
      </p>
      {isLoading ? (
        <div className="mt-4 grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !settings ? (
        <p className="mt-4 text-sm text-rose-600">No platform_settings row found — run the setup migration first.</p>
      ) : (
        <>
          {PRICE_FIELDS.map((g) => (
            <div key={g.group} className="mt-5">
              <div className="text-sm font-semibold">{g.group}</div>
              <div className="mt-2 grid gap-4 sm:grid-cols-4">
                {g.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{f.label}</span>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input type="number" min={0} step={1} value={form[f.key] ?? 0}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 pl-8 text-sm outline-none focus:border-brand-violet" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={save} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold disabled:opacity-70">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save prices
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
