import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell } from "./-ui";
import { computeCompletion, type Customer } from "@/lib/customer";
import { phoneSchema, pincodeSchema } from "@/lib/validation";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/customer/profile")({ component: ProfilePage });

const schema = z.object({
  full_name: z.string().trim().min(2, "Name required").max(120),
  phone: phoneSchema.optional().or(z.literal("")),
  gender: z.string().max(20).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  address_line1: z.string().max(200).optional().or(z.literal("")),
  address_line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(80).optional().or(z.literal("")),
  pincode: pincodeSchema.optional().or(z.literal("")),
});

function ProfilePage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Customer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["c-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("customers").select("*").eq("user_id", user!.id).maybeSingle()).data as Customer | null,
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save() {
    setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {}; parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      return setErrors(fe);
    }
    setBusy(true);
    const completion = computeCompletion(form);
    const payload = {
      full_name: form.full_name || null,
      phone: form.phone || null,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      address_line1: form.address_line1 || null,
      address_line2: form.address_line2 || null,
      city: form.city || null,
      state: form.state || null,
      pincode: form.pincode || null,
      profile_completion: completion,
    };
    const { error } = await supabase.from("customers").update(payload).eq("user_id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["c-profile"] });
    qc.invalidateQueries({ queryKey: ["customer-dashboard"] });
  }

  async function deleteAccount() {
    if (!confirm("Permanently delete your account? This cannot be undone.")) return;
    const { error } = await supabase.from("customers").update({ status: "deleted" }).eq("user_id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Account marked for deletion. Contact support to complete.");
  }

  const completion = computeCompletion(form);

  return (
    <PageShell title="Profile" subtitle="Manage your personal details.">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Profile completion</div>
          <div className="text-xs font-semibold text-brand-violet">{completion}%</div>
        </div>
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gradient-brand" style={{ width: `${completion}%` }} /></div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name *" v={form.full_name ?? ""} on={(v) => setForm({ ...form, full_name: v })} err={errors.full_name} />
          <Field label="Email" v={user?.email ?? ""} disabled />
          <Field label="Phone" v={form.phone ?? ""} on={(v) => setForm({ ...form, phone: v })} err={errors.phone} placeholder="+91 98xxxxxxxx" />
          <Field label="Date of birth" type="date" v={form.date_of_birth ?? ""} on={(v) => setForm({ ...form, date_of_birth: v })} />
          <Select label="Gender" v={form.gender ?? ""} on={(v) => setForm({ ...form, gender: v })} options={["", "Female","Male","Non-binary","Prefer not to say"]} />
          <Field label="Address line 1" v={form.address_line1 ?? ""} on={(v) => setForm({ ...form, address_line1: v })} />
          <Field label="Address line 2" v={form.address_line2 ?? ""} on={(v) => setForm({ ...form, address_line2: v })} />
          <Field label="City" v={form.city ?? ""} on={(v) => setForm({ ...form, city: v })} />
          <Field label="State" v={form.state ?? ""} on={(v) => setForm({ ...form, state: v })} />
          <Field label="Pincode" v={form.pincode ?? ""} on={(v) => setForm({ ...form, pincode: v })} err={errors.pincode} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2 text-sm font-semibold text-white">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6">
        <h3 className="font-display text-base font-semibold text-rose-600">Danger zone</h3>
        <p className="mt-1 text-sm text-muted-foreground">Deleting your account removes access to bookings, events and payment history.</p>
        <button onClick={deleteAccount} className="mt-3 rounded-full border border-rose-500/60 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10">Delete account</button>
      </div>
    </PageShell>
  );
}

function Field({ label, v, on, type = "text", err, disabled, placeholder }: { label: string; v: string; on?: (v: string) => void; type?: string; err?: string; disabled?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      <input type={type} value={v} onChange={(e) => on?.(e.target.value)} disabled={disabled} placeholder={placeholder}
        className={`w-full rounded-xl border bg-background px-3 py-2 text-sm ${err ? "border-rose-500" : "border-input"} ${disabled ? "opacity-60" : ""}`} />
      {err && <span className="mt-1 block text-[11px] text-rose-500">{err}</span>}
    </label>
  );
}
function Select({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      <select value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
        {options.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}
      </select>
    </label>
  );
}
