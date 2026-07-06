import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { fetchMyWorker, computeCompletion, WORKER_CATEGORIES, AGENCY_SERVICES } from "@/lib/worker";
import { Loader2, Save, Upload, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/worker/profile")({
  component: ProfilePage,
});

const SECTIONS = [
  { id: "basic", label: "Basic" },
  { id: "professional", label: "Professional" },
  { id: "location", label: "Location" },
  { id: "charges", label: "Charges" },
  { id: "portfolio", label: "Portfolio" },
  { id: "verification", label: "Verification" },
  { id: "review", label: "Review" },
];

type FormState = Record<string, unknown>;

function ProfilePage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [active, setActive] = useState("basic");
  const [form, setForm] = useState<FormState>({});
  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: worker, isLoading } = useQuery({
    queryKey: ["me-worker", user?.id], queryFn: () => fetchMyWorker(user!.id), enabled: !!user?.id,
  });

  useEffect(() => { if (worker) setForm(worker as unknown as FormState); }, [worker]);

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  async function upload(bucket: string, key: string, file: File): Promise<string | null> {
    if (!user) return null;
    setUploading(key);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
      return data?.signedUrl ?? null;
    } catch (e) { toast.error((e as Error).message); return null; }
    finally { setUploading(null); }
  }

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!worker) {
        const { error } = await supabase.from("workers").insert({
          owner_id: user!.id,
          full_name: (form.full_name as string) || user!.email || "Worker",
          ...patch,
        } as never);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workers").update(patch as never).eq("owner_id", user!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["me-worker", user?.id] }); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const submitForVerification = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workers")
        .update({ verification_status: "pending", ...form } as never).eq("owner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Submitted for verification"); qc.invalidateQueries({ queryKey: ["me-worker", user?.id] }); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;

  const completion = computeCompletion(form as never);
  const skills = (form.skills as string[]) ?? [];
  const langs = (form.languages as string[]) ?? [];
  const isAgency = form.worker_type === "agency";

  const saveCurrent = () => {
    const { id: _id, owner_id: _o, created_at: _c, updated_at: _u, ...patch } = form as Record<string, unknown>;
    save.mutate(patch);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Complete every section to unlock the marketplace.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Completion</div>
            <div className="text-lg font-bold text-brand-violet">{completion}%</div>
          </div>
          <div className="h-14 w-14 rounded-full border-4 border-brand-violet/20 grid place-items-center relative">
            <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(hsl(var(--brand-violet, 262 83% 58%)) ${completion * 3.6}deg, transparent 0deg)`, mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), black calc(100% - 6px))", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), black calc(100% - 6px))" }} />
            <CheckCircle2 className="h-5 w-5 text-brand-violet relative z-10" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border overflow-x-auto">
          <div className="flex">
            {SECTIONS.map((s, i) => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${active === s.id ? "border-brand-violet text-brand-violet" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <span className="mr-2 text-xs opacity-60">{i + 1}.</span>{s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {active === "basic" && (
            <>
              <FieldGrid>
                <Field label="Worker type" required>
                  <div className="grid grid-cols-2 gap-2">
                    {(["individual", "agency"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => set("worker_type", t)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold capitalize ${form.worker_type === t ? "bg-brand-violet text-white border-brand-violet" : "border-border hover:bg-accent"}`}>{t}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Full name" required>
                  <Input value={(form.full_name as string) ?? ""} onChange={(v) => set("full_name", v)} />
                </Field>
                <Field label="Profile photo">
                  <FileInput accept="image/*" uploading={uploading === "photo"} onFile={async (f) => { const url = await upload("avatars", "photo", f); if (url) set("photo_url", url); }} previewUrl={form.photo_url as string} />
                </Field>
                <Field label="Gender">
                  <Select value={(form.gender as string) ?? ""} onChange={(v) => set("gender", v)}
                    options={["", "Male", "Female", "Other", "Prefer not to say"]} />
                </Field>
                <Field label="Date of birth">
                  <Input type="date" value={(form.date_of_birth as string) ?? ""} onChange={(v) => set("date_of_birth", v)} />
                </Field>
                <Field label="Nationality">
                  <Input value={(form.nationality as string) ?? "Indian"} onChange={(v) => set("nationality", v)} />
                </Field>
                <Field label="Preferred language">
                  <Select value={(form.preferred_language as string) ?? "en"} onChange={(v) => set("preferred_language", v)}
                    options={[["en", "English"], ["hi", "Hindi"], ["mr", "Marathi"]]} />
                </Field>
              </FieldGrid>
            </>
          )}

          {active === "professional" && (
            <>
              <FieldGrid>
                <Field label="Category" required>
                  <Select value={(form.category as string) ?? ""} onChange={(v) => set("category", v)}
                    options={["", ...WORKER_CATEGORIES]} />
                </Field>
                <Field label="Years of experience">
                  <Input type="number" min={0} value={(form.years_experience as number)?.toString() ?? ""} onChange={(v) => set("years_experience", v === "" ? null : Number(v))} />
                </Field>
              </FieldGrid>
              <Field label="Skills (press Enter to add)">
                <div className="flex gap-2">
                  <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (skillInput.trim()) { set("skills", [...skills, skillInput.trim()]); setSkillInput(""); } } }}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Silver service, Bartending" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-brand-violet/10 text-brand-violet px-3 py-1 text-xs font-medium">
                      {s}<button type="button" onClick={() => set("skills", skills.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </Field>
              <Field label="Languages">
                <div className="flex gap-2">
                  <input value={langInput} onChange={(e) => setLangInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (langInput.trim()) { set("languages", [...langs, langInput.trim()]); setLangInput(""); } } }}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Marathi, Hindi, English" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {langs.map((l, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {l}<button type="button" onClick={() => set("languages", langs.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </Field>
              <Field label="Short professional bio">
                <textarea rows={4} value={(form.bio as string) ?? ""} onChange={(e) => set("bio", e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm" placeholder="Tell clients what you're great at." />
              </Field>

              {isAgency && (
                <div className="mt-6 rounded-2xl border border-border p-5 bg-muted/30">
                  <h3 className="font-semibold mb-4">Agency details</h3>
                  <FieldGrid>
                    <Field label="Agency name"><Input value={(form.agency_name as string) ?? ""} onChange={(v) => set("agency_name", v)} /></Field>
                    <Field label="Agency logo">
                      <FileInput accept="image/*" uploading={uploading === "logo"} onFile={async (f) => { const url = await upload("avatars", "logo", f); if (url) set("agency_logo_url", url); }} previewUrl={form.agency_logo_url as string} />
                    </Field>
                    <Field label="Team size"><Input type="number" min={1} value={(form.agency_team_size as number)?.toString() ?? ""} onChange={(v) => set("agency_team_size", v === "" ? null : Number(v))} /></Field>
                    <Field label="Years in business"><Input type="number" min={0} value={(form.agency_years as number)?.toString() ?? ""} onChange={(v) => set("agency_years", v === "" ? null : Number(v))} /></Field>
                    <Field label="GST (optional)"><Input value={(form.agency_gst as string) ?? ""} onChange={(v) => set("agency_gst", v)} /></Field>
                    <Field label="Business reg. no. (optional)"><Input value={(form.agency_reg_no as string) ?? ""} onChange={(v) => set("agency_reg_no", v)} /></Field>
                  </FieldGrid>
                  <Field label="Business description">
                    <textarea rows={3} value={(form.agency_description as string) ?? ""} onChange={(e) => set("agency_description", e.target.value)}
                      className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm" />
                  </Field>
                  <Field label="Services offered">
                    <div className="mt-2 flex flex-wrap gap-2">
                      {AGENCY_SERVICES.map((s) => {
                        const list = (form.agency_services as string[]) ?? [];
                        const on = list.includes(s);
                        return (
                          <button key={s} type="button"
                            onClick={() => set("agency_services", on ? list.filter((x) => x !== s) : [...list, s])}
                            className={`rounded-full px-3 py-1 text-xs font-medium border ${on ? "bg-brand-violet text-white border-brand-violet" : "border-border hover:bg-accent"}`}>{s}</button>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              )}
            </>
          )}

          {active === "location" && (
            <FieldGrid>
              <Field label="Country"><Input value={(form.country as string) ?? "India"} onChange={(v) => set("country", v)} /></Field>
              <Field label="State"><Input value={(form.state as string) ?? ""} onChange={(v) => set("state", v)} /></Field>
              <Field label="District"><Input value={(form.district as string) ?? ""} onChange={(v) => set("district", v)} /></Field>
              <Field label="City" required><Input value={(form.city as string) ?? ""} onChange={(v) => set("city", v)} /></Field>
              <Field label="PIN Code" required>
                <Input value={(form.pincode as string) ?? ""} onChange={(v) => set("pincode", v)} placeholder="6 digits" />
              </Field>
              <Field label="Address">
                <Input value={(form.address as string) ?? ""} onChange={(v) => set("address", v)} />
              </Field>
              <Field label="Preferred working cities (comma separated)">
                <Input value={((form.preferred_cities as string[]) ?? []).join(", ")} onChange={(v) => set("preferred_cities", v.split(",").map((s) => s.trim()).filter(Boolean))} />
              </Field>
              <Field label="Max travel distance (km)">
                <Input type="number" min={0} value={(form.max_travel_km as number)?.toString() ?? ""} onChange={(v) => set("max_travel_km", v === "" ? null : Number(v))} />
              </Field>
            </FieldGrid>
          )}

          {active === "charges" && (
            <FieldGrid>
              <Field label="Payment type" required>
                <Select value={(form.payment_type as string) ?? "daily"} onChange={(v) => set("payment_type", v)}
                  options={[["hourly", "Hourly"], ["daily", "Daily"], ["per_event", "Per Event"], ["monthly", "Monthly"]]} />
              </Field>
              <Field label="Hourly charge (₹)"><Input type="number" min={0} value={(form.hourly_charges as number)?.toString() ?? ""} onChange={(v) => set("hourly_charges", v === "" ? null : Number(v))} /></Field>
              <Field label="Daily charge (₹)"><Input type="number" min={0} value={(form.daily_charges as number)?.toString() ?? ""} onChange={(v) => set("daily_charges", v === "" ? null : Number(v))} /></Field>
              <Field label="Per event charge (₹)"><Input type="number" min={0} value={(form.per_event_charges as number)?.toString() ?? ""} onChange={(v) => set("per_event_charges", v === "" ? null : Number(v))} /></Field>
              <Field label="Monthly charge (₹)"><Input type="number" min={0} value={(form.monthly_charges as number)?.toString() ?? ""} onChange={(v) => set("monthly_charges", v === "" ? null : Number(v))} /></Field>
              <Field label="Minimum booking price (₹)"><Input type="number" min={0} value={(form.min_booking_price as number)?.toString() ?? ""} onChange={(v) => set("min_booking_price", v === "" ? null : Number(v))} /></Field>
            </FieldGrid>
          )}

          {active === "portfolio" && (
            <>
              <MediaGrid label="Work images" bucket="worker-media" prefix="images" values={(form.work_images as string[]) ?? []} onChange={(v) => set("work_images", v)} upload={upload} uploading={uploading} />
              <MediaGrid label="Videos" bucket="worker-media" prefix="videos" accept="video/*" values={(form.work_videos as string[]) ?? []} onChange={(v) => set("work_videos", v)} upload={upload} uploading={uploading} />
              <MediaGrid label="Certificates" bucket="worker-media" prefix="certs" accept="image/*,.pdf" values={(form.certificates as string[]) ?? []} onChange={(v) => set("certificates", v)} upload={upload} uploading={uploading} />
              <MediaGrid label="Experience documents (optional)" bucket="worker-media" prefix="docs" accept="image/*,.pdf" values={(form.documents as string[]) ?? []} onChange={(v) => set("documents", v)} upload={upload} uploading={uploading} />
            </>
          )}

          {active === "verification" && (
            <>
              <FieldGrid>
                <Field label="Identity proof type" required>
                  <Select value={(form.id_proof_type as string) ?? ""} onChange={(v) => set("id_proof_type", v)}
                    options={["", "Aadhaar", "PAN", "Driving License", "Passport"]} />
                </Field>
                <Field label="ID number" required>
                  <Input value={(form.id_proof_number as string) ?? ""} onChange={(v) => set("id_proof_number", v)} />
                </Field>
                <Field label="ID document">
                  <FileInput accept="image/*,.pdf" uploading={uploading === "id"} onFile={async (f) => { const url = await upload("worker-media", "id", f); if (url) set("id_proof_url", url); }} previewUrl={form.id_proof_url as string} />
                </Field>
                <Field label="Selfie verification">
                  <FileInput accept="image/*" uploading={uploading === "selfie"} onFile={async (f) => { const url = await upload("worker-media", "selfie", f); if (url) set("selfie_url", url); }} previewUrl={form.selfie_url as string} />
                </Field>
              </FieldGrid>
              <div className="mt-4 rounded-2xl border border-border p-5 bg-muted/30">
                <h3 className="font-semibold mb-3">Emergency contact</h3>
                <FieldGrid>
                  <Field label="Name"><Input value={(form.emergency_contact_name as string) ?? ""} onChange={(v) => set("emergency_contact_name", v)} /></Field>
                  <Field label="Phone"><Input value={(form.emergency_contact_phone as string) ?? ""} onChange={(v) => set("emergency_contact_phone", v)} /></Field>
                  <Field label="Relation"><Input value={(form.emergency_contact_relation as string) ?? ""} onChange={(v) => set("emergency_contact_relation", v)} /></Field>
                </FieldGrid>
              </div>
            </>
          )}

          {active === "review" && (
            <div>
              <div className="rounded-2xl border border-border p-5 space-y-2 text-sm">
                <ReviewRow label="Name" value={form.full_name as string} />
                <ReviewRow label="Type" value={form.worker_type as string} />
                <ReviewRow label="Category" value={form.category as string} />
                <ReviewRow label="City" value={`${form.city ?? ""}, ${form.state ?? ""}`} />
                <ReviewRow label="Experience" value={form.years_experience != null ? `${form.years_experience} years` : "—"} />
                <ReviewRow label="Skills" value={skills.join(", ") || "—"} />
                <ReviewRow label="Payment" value={form.payment_type as string} />
                <ReviewRow label="Portfolio images" value={((form.work_images as string[]) ?? []).length} />
                <ReviewRow label="ID proof" value={form.id_proof_type as string} />
                <ReviewRow label="Verification status" value={form.verification_status as string} />
              </div>
              {form.verification_status === "approved" ? (
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div className="text-sm"><strong>Profile approved.</strong> You appear on the marketplace and can receive jobs.</div>
                </div>
              ) : form.verification_status === "pending" ? (
                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  <div className="text-sm"><strong>Verification in progress.</strong> Our team reviews profiles within 24-48 hours.</div>
                </div>
              ) : (
                <button onClick={() => submitForVerification.mutate()} disabled={submitForVerification.isPending}
                  className="mt-6 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold text-white">
                  {submitForVerification.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit for verification
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 flex flex-wrap items-center justify-between gap-3 bg-muted/30">
          <div className="text-xs text-muted-foreground">Section: <strong className="text-foreground capitalize">{active}</strong></div>
          <div className="flex gap-2">
            <button onClick={() => { const i = SECTIONS.findIndex((s) => s.id === active); if (i > 0) setActive(SECTIONS[i - 1].id); }}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-accent">Previous</button>
            <button onClick={saveCurrent} disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold text-white">
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </button>
            <button onClick={() => { const i = SECTIONS.findIndex((s) => s.id === active); if (i < SECTIONS.length - 1) setActive(SECTIONS[i + 1].id); }}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-accent">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 md:grid-cols-2">{children}</div>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}{required && <span className="text-rose-500"> *</span>}</span>{children}</label>;
}
function Input({ value, onChange, type = "text", ...rest }: { value: string; onChange: (v: string) => void; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest}
    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/40" />;
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
function MediaGrid({ label, bucket, prefix, accept = "image/*", values, onChange, upload, uploading }: {
  label: string; bucket: string; prefix: string; accept?: string; values: string[]; onChange: (v: string[]) => void;
  upload: (bucket: string, key: string, file: File) => Promise<string | null>; uploading: string | null;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">{label}</div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-input px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-accent">
          {uploading === prefix ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Add
          <input type="file" accept={accept} className="sr-only"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await upload(bucket, prefix, f); if (url) onChange([...values, url]); } }} />
        </label>
      </div>
      {values.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">No files uploaded yet</div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {values.map((u, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted">
              {accept.startsWith("image") ? <img src={u} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">File</div>}
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
