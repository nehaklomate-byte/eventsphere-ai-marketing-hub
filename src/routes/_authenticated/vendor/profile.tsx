import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { fetchMyVendor, uploadVendorFile, computeVendorCompletion, VENDOR_CATEGORIES, fetchVendorPackages, saveVendorPackage, deleteVendorPackage, type VendorPackage } from "@/lib/vendor.ts";
import { Loader2, Save, Upload, X, CheckCircle2, ShieldCheck, Store, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PublicProfileCard } from "@/components/PublicProfileCard";
import { ProfileHistoryPanel } from "@/components/ProfileHistoryPanel";

// Mirrors src/routes/_authenticated/worker/profile.tsx exactly — same
// section-tab structure, same helper components, same publish toggle
// and submit-for-verification pattern, adapted to vendor fields. Vendor
// only has ONE gating column (`status`), unlike worker's two
// (`status` + `marketplace_visible`) — see togglePublish below.
export const Route = createFileRoute("/_authenticated/vendor/profile")({
  component: ProfilePage,
});

const SECTIONS = [
  { id: "basic", label: "Basic" },
  { id: "location", label: "Location" },
  { id: "legal", label: "Legal & Payout" },
  { id: "portfolio", label: "Portfolio" },
  { id: "packages", label: "Packages" },
  { id: "review", label: "Review" },
];

type FormState = Record<string, unknown>;

function ProfilePage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [active, setActive] = useState("basic");
  const [partnerTermsChecked, setPartnerTermsChecked] = useState(false);
  const [form, setForm] = useState<FormState>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["me-vendor", user?.id], queryFn: () => fetchMyVendor(user!.id), enabled: !!user?.id,
  });

  const { data: packages, refetch: refetchPackages } = useQuery({
    queryKey: ["me-vendor-packages", vendor?.id],
    queryFn: () => fetchVendorPackages(vendor!.id),
    enabled: !!vendor?.id,
  });

  useEffect(() => { if (vendor) setForm(vendor as unknown as FormState); }, [vendor]);

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  async function upload(key: string, file: File): Promise<string | null> {
    if (!user) return null;
    setUploading(key);
    try { return await uploadVendorFile(user.id, key, file); }
    finally { setUploading(null); }
  }

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!vendor) {
        const { error } = await supabase.from("vendors").insert({
          owner_id: user!.id,
          business_name: (form.business_name as string) || user!.email || "Vendor",
          ...patch,
        } as never);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("vendors").update(patch as never).eq("owner_id", user!.id).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Save was blocked — please refresh and try again.");
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["me-vendor", user?.id] }); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  // IMPORTANT: `{ ...form, verification_status: "pending" }` — spread
  // FIRST, override AFTER. Doing it the other way around silently
  // overwrites "pending" back to form's already-loaded old value (this
  // exact bug meant Worker submissions never reached the admin queue).
  const submitForVerification = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("vendors")
        .update({ ...form, verification_status: "pending", partner_terms_accepted_at: new Date().toISOString() } as never).eq("owner_id", user!.id).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Submission was blocked — please refresh the page and try again. If this keeps happening, contact support.");
    },
    onSuccess: () => { toast.success("Submitted for verification"); qc.invalidateQueries({ queryKey: ["me-vendor", user?.id] }); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  // Vendor only has ONE gating column: `status` ('draft'/'published') —
  // the public-read RLS policy checks this directly. Unlike Worker
  // (which also needs `marketplace_visible`), a single field is enough.
  const togglePublish = useMutation({
    mutationFn: async (publish: boolean) => {
      const { data, error } = await supabase.from("vendors")
        .update({ status: publish ? "published" : "draft" } as never)
        .eq("owner_id", user!.id).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Update was blocked — please refresh and try again.");
    },
    onSuccess: (_data, publish) => {
      toast.success(publish ? "You're live! Now visible on the marketplace." : "Hidden from the marketplace.");
      qc.invalidateQueries({ queryKey: ["me-vendor", user?.id] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;

  const completion = computeVendorCompletion(form as never);
  const serviceAreas = (form.service_areas as string[]) ?? [];
  const availableDays = (form.available_days as string[]) ?? [];
  const portfolio = (form.portfolio as string[]) ?? [];

  return (
    <div className="space-y-8 pb-24">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <Store className="h-7 w-7 text-brand-violet" /> Vendor Profile
        </h1>
        <p className="mt-1 text-muted-foreground">
          {form.verification_status === "approved" && form.status === "published"
            ? "Your business is verified and visible to customers and venue owners."
            : form.verification_status === "pending"
            ? "Submitted — waiting for admin verification."
            : "Fill this in fully, then submit for verification to appear in search results."}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-full border border-border bg-card p-1 text-sm">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 font-semibold transition ${active === s.id ? "bg-gradient-brand text-white" : "text-muted-foreground hover:bg-accent"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {active === "basic" && (
          <FieldGrid>
            <Field label="Business name" required><Input value={(form.business_name as string) ?? ""} onChange={(v) => set("business_name", v)} /></Field>
            <Field label="Owner name" required><Input value={(form.owner_full_name as string) ?? ""} onChange={(v) => set("owner_full_name", v)} /></Field>
            <Field label="Vendor category" required><Select value={(form.category as string) ?? ""} onChange={(v) => set("category", v)} options={["", ...VENDOR_CATEGORIES]} /></Field>
            <Field label="Years of experience"><Input type="number" value={String(form.years_experience ?? "")} onChange={(v) => set("years_experience", v ? Number(v) : null)} /></Field>
          </FieldGrid>
        )}

        {active === "location" && (
          <FieldGrid>
            <Field label="Email"><Input type="email" value={(form.email as string) ?? ""} onChange={(v) => set("email", v)} /></Field>
            <Field label="Phone"><Input value={(form.phone as string) ?? ""} onChange={(v) => set("phone", v)} /></Field>
            <Field label="City" required><Input value={(form.city as string) ?? ""} onChange={(v) => set("city", v)} /></Field>
            <Field label="State" required><Input value={(form.state as string) ?? ""} onChange={(v) => set("state", v)} /></Field>
            <Field label="Pincode" required><Input value={(form.pincode as string) ?? ""} onChange={(v) => set("pincode", v)} /></Field>
            <Field label="Address"><Input value={(form.address as string) ?? ""} onChange={(v) => set("address", v)} /></Field>
            <Field label="Service areas"><CsvInput key={`sa-${vendor?.id ?? "new"}`} initial={serviceAreas} onCommit={(arr) => set("service_areas", arr)} placeholder="Comma-separated cities you serve, e.g. Pune, Mumbai, Nashik" /></Field>
            <Field label="Available days"><CsvInput key={`ad-${vendor?.id ?? "new"}`} initial={availableDays} onCommit={(arr) => set("available_days", arr)} placeholder="e.g., Mon, Tue, Wed or All days on request" /></Field>
          </FieldGrid>
        )}

        {active === "legal" && (
          <>
          <FieldGrid>
            <Field label="GST number"><Input value={(form.gst_number as string) ?? ""} onChange={(v) => set("gst_number", v)} placeholder="Optional" /></Field>
            <Field label="PAN number"><Input value={(form.pan_number as string) ?? ""} onChange={(v) => set("pan_number", v)} placeholder="Optional" /></Field>
            <Field label="Website"><Input value={(form.website as string) ?? ""} onChange={(v) => set("website", v)} placeholder="https://…" /></Field>
            <Field label="Instagram"><Input value={(form.instagram as string) ?? ""} onChange={(v) => set("instagram", v)} placeholder="https://instagram.com/…" /></Field>
            <Field label="Facebook"><Input value={(form.facebook as string) ?? ""} onChange={(v) => set("facebook", v)} placeholder="https://facebook.com/…" /></Field>
            <Field label="Price catalogue (PDF)">
              <FileInput accept=".pdf" uploading={uploading === "catalogue"} onFile={async (f) => { const url = await upload("catalogue", f); if (url) set("price_catalogue_url", url); }} previewUrl={undefined} />
              {form.price_catalogue_url ? <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">Catalogue uploaded ✓</p> : null}
            </Field>
          </FieldGrid>
          <div className="mt-4 rounded-2xl border border-border p-5 bg-muted/30">
            <h3 className="font-semibold mb-1">Payout details</h3>
            <p className="text-xs text-muted-foreground mb-3">Private — only used by EventOrbit Nova to pay you for completed jobs. Never shown to customers.</p>
            <FieldGrid>
              <Field label="UPI ID"><Input value={(form.payout_upi_id as string) ?? ""} onChange={(v) => set("payout_upi_id", v)} placeholder="yourname@okhdfcbank" /></Field>
            </FieldGrid>
          </div>
          </>
        )}

        {active === "portfolio" && (
          <>
            <FieldGrid>
              <Field label="Business logo">
                <FileInput accept="image/*" uploading={uploading === "logo"} onFile={async (f) => { const url = await upload("logo", f); if (url) set("logo_url", url); }} previewUrl={form.logo_url as string} />
              </Field>
            </FieldGrid>
            <MediaGrid label="Portfolio photos" prefix="portfolio" values={portfolio} onChange={(v) => set("portfolio", v)} upload={upload} uploading={uploading} />
          </>
        )}

        {active === "packages" && (
          vendor?.id ? (
            <PackagesEditor vendorId={vendor.id} packages={packages ?? []} onChanged={refetchPackages} />
          ) : (
            <p className="text-sm text-muted-foreground">Save your basic profile first (so we have a vendor ID), then come back to add packages.</p>
          )
        )}

        {active === "review" && (
          <div>
            <div className="rounded-2xl border border-border p-5 space-y-2 text-sm">
              <ReviewRow label="Business name" value={form.business_name as string} />
              <ReviewRow label="Category" value={form.category as string} />
              <ReviewRow label="City" value={`${form.city ?? ""}, ${form.state ?? ""}`} />
              <ReviewRow label="Experience" value={form.years_experience != null ? `${form.years_experience} years` : "—"} />
              <ReviewRow label="Service areas" value={serviceAreas.join(", ") || "—"} />
              <ReviewRow label="Portfolio photos" value={portfolio.length} />
              <ReviewRow label="GST" value={form.gst_number as string} />
              <ReviewRow label="Verification status" value={form.verification_status as string} />
            </div>
            {form.verification_status === "approved" ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div className="text-sm"><strong>Profile approved.</strong> Publish it to appear on the marketplace and start receiving enquiries.</div>
                </div>
                <button onClick={() => togglePublish.mutate(form.status !== "published")} disabled={togglePublish.isPending}
                  className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-70 ${
                    form.status === "published" ? "bg-zinc-800 text-white hover:bg-zinc-900" : "btn-brand btn-brand-hover text-white"
                  }`}>
                  {togglePublish.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {form.status === "published" ? "Hide from marketplace" : "Show on marketplace"}
                </button>
                {form.status === "published" && (
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">You're live — customers and venue owners can find and enquire with you right now.</p>
                )}
              </div>
            ) : form.verification_status === "pending" ? (
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <div className="text-sm"><strong>Verification in progress.</strong> Our team reviews profiles within 24-48 hours.</div>
              </div>
            ) : (
              <div className="mt-6">
                <label className="flex items-start gap-2.5 text-sm">
                  <input type="checkbox" checked={partnerTermsChecked} onChange={(e) => setPartnerTermsChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-[color:var(--brand-violet)]" />
                  <span className="text-muted-foreground">
                    I accept the <a href="/partner-terms" target="_blank" rel="noreferrer" className="text-brand-violet underline">Partner Terms</a>, including the commission structure, payout schedule, and off-platform circumvention policy.
                  </span>
                </label>
                <button onClick={() => submitForVerification.mutate()} disabled={submitForVerification.isPending || !partnerTermsChecked}
                  className="mt-3 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {submitForVerification.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit for verification
                </button>
              </div>
            )}

            {!!form.id && (
              <div className="mt-6">
                <PublicProfileCard
                  role="vendor" entityId={form.id as string} variant={null} name={(form.business_name as string) ?? ""}
                  active={!!form.public_profile_active} slug={(form.slug as string) ?? null}
                  verificationApproved={form.verification_status === "approved"}
                  trialEndsAt={(form.trial_ends_at as string) ?? null}
                  subscriptionActive={!!form.subscription_active}
                  subscriptionExpiresAt={(form.subscription_expires_at as string) ?? null}
                  onActivated={(slug) => { set("public_profile_active", true); set("slug", slug); }}
                  onSubscribed={(expiresAt) => { set("subscription_active", true); set("subscription_expires_at", expiresAt); }}
                />
              </div>
            )}

            {!!form.id && (
              <div className="mt-6">
                <ProfileHistoryPanel entityType="vendors" entityId={form.id as string} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:pl-72">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 py-3 md:px-8">
          <button disabled={save.isPending} onClick={() => save.mutate(form)} className="flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save progress
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- small shared UI helpers (same pattern as worker/profile.tsx) ---------- */

function FieldGrid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 md:grid-cols-2">{children}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}{required && <span className="text-rose-500"> *</span>}</span>{children}</label>;
}
function Input({ value, onChange, type = "text", ...rest }: { value: string; onChange: (v: string) => void; type?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest}
    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/40" />;
}
// Free-typing comma-separated input. Fixed bug: the old version derived its
// displayed value straight from the parsed-and-filtered array on every
// keystroke, so a trailing comma or a space right after a comma was wiped
// out before the person could type the next item. This keeps its own raw
// text while typing and only parses into an array on blur / when the
// person is done.
function CsvInput({ initial, onCommit, placeholder }: { initial: string[]; onCommit: (arr: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState(initial.join(", "));
  function commit(t: string) {
    onCommit(t.split(",").map((s) => s.trim()).filter(Boolean));
  }
  return (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/40"
    />
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: (string | [string, string])[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o || "Select..."];
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}
function FileInput({ accept, uploading, onFile, previewUrl }: { accept?: string; uploading?: boolean; onFile: (f: File) => void; previewUrl?: string }) {
  return (
    <div className="flex items-center gap-3">
      {previewUrl && <img src={previewUrl} alt="" className="h-12 w-12 rounded-xl object-cover border border-border" />}
      <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-input px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? "Uploading…" : previewUrl ? "Replace" : "Upload"}
        <input type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      </label>
    </div>
  );
}
function MediaGrid({ label, prefix, accept = "image/*", values, onChange, upload, uploading }: {
  label: string; prefix: string; accept?: string; values: string[]; onChange: (v: string[]) => void;
  upload: (key: string, file: File) => Promise<string | null>; uploading: string | null;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">{label}</div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-input px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-accent">
          {uploading === prefix ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Add
          <input type="file" accept={accept} className="sr-only"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await upload(prefix, f); if (url) onChange([...values, url]); } }} />
        </label>
      </div>
      {values.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No files uploaded yet</div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {values.map((u, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function ReviewRow({ label, value }: { label: string; value: string | number | undefined }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="font-medium text-foreground text-right truncate">{value || "—"}</span></div>;
}

/** Basic/Premium/Luxury (or custom-named) price tiers a customer can pick
 * on the vendor's public profile instead of a single flat "starting
 * price". Deliberately simple — name + price + optional description,
 * no per-package inclusions list — per the "don't add more fields than
 * this for MVP" guidance. */
function PackagesEditor({ vendorId, packages, onChanged }: { vendorId: string; packages: VendorPackage[]; onChanged: () => void }) {
  const [rows, setRows] = useState<Partial<VendorPackage>[]>(packages);
  const [saving, setSaving] = useState<number | null>(null);
  useEffect(() => setRows(packages), [packages]);

  function updateRow(i: number, patch: Partial<VendorPackage>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save(i: number) {
    const r = rows[i];
    if (!r.name?.trim() || !r.price) { toast.error("Package name and price are required."); return; }
    setSaving(i);
    try {
      await saveVendorPackage({ ...r, vendor_id: vendorId, sort_order: r.sort_order ?? i } as never);
      toast.success("Package saved");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(null); }
  }

  async function remove(i: number) {
    const r = rows[i];
    if (r.id) { try { await deleteVendorPackage(r.id); toast.success("Removed"); onChanged(); } catch (e) { toast.error((e as Error).message); return; } }
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add 2–3 price tiers customers can choose from — e.g. Basic, Premium, Luxury. Leave this empty to keep showing just your starting price.</p>
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-[1fr_140px_2fr_auto] items-start">
          <Field label="Package name"><Input value={r.name ?? ""} onChange={(v) => updateRow(i, { name: v })} placeholder="Basic" /></Field>
          <Field label="Price (₹)"><Input type="number" value={r.price?.toString() ?? ""} onChange={(v) => updateRow(i, { price: Number(v) })} placeholder="15000" /></Field>
          <Field label="What's included (optional)"><Input value={r.description ?? ""} onChange={(v) => updateRow(i, { description: v })} placeholder="Short description" /></Field>
          <div className="flex gap-2 pt-6">
            <button onClick={() => save(i)} disabled={saving === i} className="rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50">
              {saving === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => remove(i)} className="rounded-lg border border-input px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() => setRows((prev) => [...prev, { name: "", price: undefined, description: "", sort_order: prev.length }])}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-input px-4 py-2 text-xs font-semibold hover:bg-accent"
      >
        <Plus className="h-3.5 w-3.5" /> Add package
      </button>
    </div>
  );
}
