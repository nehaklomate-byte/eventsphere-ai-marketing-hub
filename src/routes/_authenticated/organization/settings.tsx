import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyOrganization, type Organization } from "@/lib/organization";
import { AccountSettingsSection } from "@/components/AccountSettingsSections";

export const Route = createFileRoute("/_authenticated/organization/settings")({
  head: () => ({ meta: [{ title: "Settings — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

type FormState = Pick<
  Organization,
  "name" | "org_type" | "industry" | "owner_full_name" | "email" | "phone" | "alt_phone" |
  "state" | "city" | "address" | "pincode" | "website" | "gst_number" | "business_reg_number"
>;

const EMPTY: FormState = {
  name: "", org_type: "", industry: "", owner_full_name: "", email: "", phone: "", alt_phone: "",
  state: "", city: "", address: "", pincode: "", website: "", gst_number: "", business_reg_number: "",
};

async function updateOrganization(id: string, patch: Partial<Organization>) {
  const { data, error } = await supabase.from("organizations").update(patch as never).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Update didn't apply — check admin/RLS policies on organizations.");
}

/** Resubmitting after a rejection puts the profile back in the queue —
 * mirrors the two-step approval pattern used for account_status. */
async function resubmitForVerification(id: string) {
  const { data, error } = await supabase
    .from("organizations")
    .update({ verification_status: "pending", rejection_reason: null } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Resubmit didn't apply — check admin/RLS policies on organizations.");
}

function SettingsPage() {
  const qc = useQueryClient();
  const { data: org, isLoading } = useQuery({ queryKey: ["organization-mine"], queryFn: fetchMyOrganization });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!org) return;
    setForm({
      name: org.name ?? "", org_type: org.org_type ?? "", industry: org.industry ?? "",
      owner_full_name: org.owner_full_name ?? "", email: org.email ?? "", phone: org.phone ?? "",
      alt_phone: org.alt_phone ?? "", state: org.state ?? "", city: org.city ?? "", address: org.address ?? "",
      pincode: org.pincode ?? "", website: org.website ?? "", gst_number: org.gst_number ?? "",
      business_reg_number: org.business_reg_number ?? "",
    });
  }, [org]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateOrganization(org.id, form);
      setMessage({ type: "success", text: "Saved." });
      await qc.invalidateQueries({ queryKey: ["organization-mine"] });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResubmit() {
    if (!org?.id) return;
    if (!window.confirm("Resubmit your organization for admin verification?")) return;
    setResubmitting(true);
    setMessage(null);
    try {
      await resubmitForVerification(org.id);
      setMessage({ type: "success", text: "Resubmitted — an admin will review your details again." });
      await qc.invalidateQueries({ queryKey: ["organization-mine"] });
      await qc.invalidateQueries({ queryKey: ["organization-gate"] });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to resubmit" });
    } finally {
      setResubmitting(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your organization's profile details.</p>
      </div>

      {org?.verification_status === "rejected" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Your last submission was rejected</p>
            {org.rejection_reason && <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-400">{org.rejection_reason}</p>}
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Update the details below, then resubmit for review.</p>
          </div>
          <button
            onClick={handleResubmit}
            disabled={resubmitting}
            className="flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shrink-0"
          >
            <RotateCcw className="h-4 w-4" /> {resubmitting ? "Resubmitting…" : "Resubmit for verification"}
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Organization name" value={form.name} onChange={(v) => set("name", v)} required />
          <Field label="Organization type" value={form.org_type ?? ""} onChange={(v) => set("org_type", v)} placeholder="College, Corporate, NGO…" />
          <Field label="Industry / Sector" value={form.industry ?? ""} onChange={(v) => set("industry", v)} />
          <Field label="Owner full name" value={form.owner_full_name ?? ""} onChange={(v) => set("owner_full_name", v)} />
          <Field label="Email" type="email" value={form.email ?? ""} onChange={(v) => set("email", v)} />
          <Field label="Phone" value={form.phone ?? ""} onChange={(v) => set("phone", v)} />
          <Field label="Alternative contact" value={form.alt_phone ?? ""} onChange={(v) => set("alt_phone", v)} />
          <Field label="Website" value={form.website ?? ""} onChange={(v) => set("website", v)} />
          <Field label="GST number" value={form.gst_number ?? ""} onChange={(v) => set("gst_number", v)} />
          <Field label="Business / registration number" value={form.business_reg_number ?? ""} onChange={(v) => set("business_reg_number", v)} />
          <Field label="City" value={form.city ?? ""} onChange={(v) => set("city", v)} />
          <Field label="State" value={form.state ?? ""} onChange={(v) => set("state", v)} />
          <Field label="Pincode" value={form.pincode ?? ""} onChange={(v) => set("pincode", v)} />
        </div>
        <div>
          <label className="text-sm font-medium">Address</label>
          <textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} rows={3}
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
        </div>

        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>{message.text}</p>
        )}

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div>
        <h2 className="font-display text-xl font-semibold">Your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">These settings are personal to you, separate from the organization's profile above.</p>
      </div>
      <AccountSettingsSection />
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required = false, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}{required && " *"}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm"
      />
    </div>
  );
}
