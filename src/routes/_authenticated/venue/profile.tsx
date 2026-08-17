import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Upload, Loader2, X, Save, Eye, EyeOff, Wallet, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyHalls, createHall, updateHall, type Hall } from "@/lib/venue";
import { VENDOR_CATEGORIES } from "@/lib/vendor";
import { PublicProfileCard } from "@/components/PublicProfileCard";
import { ProfileHistoryPanel } from "@/components/ProfileHistoryPanel";

export const Route = createFileRoute("/_authenticated/venue/profile")({
  head: () => ({ meta: [{ title: "Venue Profile — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: VenueProfilePage,
});

const FACILITY_OPTIONS = [
  "AC", "Parking", "In-house catering", "Stage", "DJ / Sound system", "Generator backup",
  "Rooms for stay", "Wi-Fi", "Elevator", "Wheelchair access", "Swimming pool", "Garden / Lawn",
];

function VenueProfilePage() {
  const qc = useQueryClient();
  const { data: halls, isLoading } = useQuery({ queryKey: ["venue-halls"], queryFn: fetchMyHalls });
  const hall = halls?.[0];

  const [form, setForm] = useState<Partial<Hall>>({});
  const [saving, setSaving] = useState(false);
  const [partnerTermsChecked, setPartnerTermsChecked] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (hall) setForm(hall);
  }, [hall?.id]);

  function set<K extends keyof Hall>(key: K, value: Hall[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleFacility(name: string) {
    const current = (form.facilities as Record<string, boolean>) ?? {};
    set("facilities", { ...current, [name]: !current[name] } as never);
  }

  function toggleService(category: string) {
    const current = (form.service_offerings as Hall["service_offerings"]) ?? {};
    const existing = current[category] ?? { in_house: false, price: null, options: [] };
    set("service_offerings", { ...current, [category]: { ...existing, in_house: !existing.in_house } } as never);
  }

  function setServicePrice(category: string, price: number | null) {
    const current = (form.service_offerings as Hall["service_offerings"]) ?? {};
    const existing = current[category] ?? { in_house: true, price: null, options: [] };
    set("service_offerings", { ...current, [category]: { ...existing, price } } as never);
  }

  // Options are how a customer builds their own decoration/menu instead
  // of getting one fixed price — e.g. Caterer: "Paneer Butter Masala —
  // ₹180/plate", Decorator: "Floral stage — ₹15,000". per_guest ones
  // multiply by the guest count the customer enters at booking time.
  function addServiceOption(category: string, name: string, price: number, perGuest: boolean) {
    const current = (form.service_offerings as Hall["service_offerings"]) ?? {};
    const existing = current[category] ?? { in_house: true, price: null, options: [] };
    const option = { id: crypto.randomUUID(), name, price, per_guest: perGuest };
    set("service_offerings", { ...current, [category]: { ...existing, in_house: true, options: [...existing.options, option] } } as never);
  }

  function removeServiceOption(category: string, optionId: string) {
    const current = (form.service_offerings as Hall["service_offerings"]) ?? {};
    const existing = current[category] ?? { in_house: true, price: null, options: [] };
    set("service_offerings", { ...current, [category]: { ...existing, options: existing.options.filter((o) => o.id !== optionId) } } as never);
  }

  function setExtra(key: string, value: unknown) {
    const current = (form.additional_info as Record<string, unknown>) ?? {};
    set("additional_info", { ...current, [key]: value } as never);
  }

  function setDocument(name: string, url: string) {
    const current = (form.documents as { name: string; url: string }[]) ?? [];
    const withoutExisting = current.filter((d) => d.name !== name);
    set("documents", [...withoutExisting, { name, url, uploaded_at: new Date().toISOString() }] as never);
  }

  async function upload(bucket: string, key: string, file: File): Promise<string | null> {
    setUploading(key);
    try {
      const path = `${form.id ?? "new"}/${key}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      return null;
    } finally {
      setUploading(null);
    }
  }

  async function handleSave(publish?: boolean) {
    const wasRejectedOrNewCheck = !form.id || form.verification_status === "rejected";
    if (publish && wasRejectedOrNewCheck && !partnerTermsChecked) {
      toast.error("Please accept the Partner Terms before submitting for verification.");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");

      const patch: Partial<Hall> = { ...form };
      if (publish !== undefined) patch.status = publish ? "published" : "draft";
      delete (patch as { id?: string }).id;

      // A first-time submission or an edit after rejection goes back into
      // the admin review queue. An already-approved venue keeps its status
      // on routine edits, so owners aren't re-blocked for small changes.
      const wasRejectedOrNew = !form.id || form.verification_status === "rejected";
      if (wasRejectedOrNew) {
        patch.verification_status = "pending";
        (patch as Partial<Hall> & { partner_terms_accepted_at?: string }).partner_terms_accepted_at = new Date().toISOString();
      }

      if (!form.id) {
        const created = await createHall(userData.user.id, form.name || "My Venue");
        await updateHall(created.id, patch);
        setForm({ ...created, ...patch });
      } else {
        await updateHall(form.id, patch);
      }
      toast.success(
        wasRejectedOrNew
          ? "Submitted for admin review — you'll be notified once it's approved."
          : publish === true ? "Venue published — now visible on the marketplace." : publish === false ? "Venue unpublished." : "Saved"
      );
      qc.invalidateQueries({ queryKey: ["venue-halls"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;
  }

  const facilities = (form.facilities as Record<string, boolean>) ?? {};
  const serviceOfferings = (form.service_offerings as Hall["service_offerings"]) ?? {};
  const extra = (form.additional_info as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-8 pb-24">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <Building2 className="h-7 w-7 text-brand-violet" /> Venue Profile
        </h1>
        <p className="mt-1 text-muted-foreground">
          {form.verification_status === "approved" && form.status === "published"
            ? "Your venue is verified and visible to customers on the marketplace."
            : form.verification_status === "pending"
            ? "Submitted — waiting for admin verification."
            : "Fill this in fully, then submit for verification to appear in customer search results."}
        </p>
      </div>

      {/* Basic info */}
      <Section title="Basic information">
        <Field label="Venue name" required>
          <Input value={form.name ?? ""} onChange={(v) => set("name", v as never)} placeholder="e.g. Grand Celebration Banquet Hall" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category"><Input value={form.category ?? ""} onChange={(v) => set("category", v as never)} placeholder="Banquet Hall / Resort / Lawn / Hotel" /></Field>
          <Field label="Website"><Input value={form.website ?? ""} onChange={(v) => set("website", v as never)} placeholder="https://…" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact email"><Input value={form.email ?? ""} onChange={(v) => set("email", v as never)} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ""} onChange={(v) => set("phone", v as never)} /></Field>
          <Field label="Alternate phone"><Input value={form.alt_phone ?? ""} onChange={(v) => set("alt_phone", v as never)} /></Field>
        </div>
      </Section>

      {/* Location */}
      <Section title="Location">
        <Field label="Address"><Input value={form.address ?? ""} onChange={(v) => set("address", v as never)} /></Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="City" required><Input value={form.city ?? ""} onChange={(v) => set("city", v as never)} /></Field>
          <Field label="State"><Input value={form.state ?? ""} onChange={(v) => set("state", v as never)} /></Field>
          <Field label="Pincode"><Input value={form.pincode ?? ""} onChange={(v) => set("pincode", v as never)} /></Field>
          <Field label="Country"><Input value={form.country ?? "India"} onChange={(v) => set("country", v as never)} /></Field>
        </div>
      </Section>

      {/* Capacity */}
      <Section title="Capacity">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Min guests"><NumberInput value={form.min_guests} onChange={(v) => set("min_guests", v as never)} /></Field>
          <Field label="Max guests"><NumberInput value={form.max_guests} onChange={(v) => set("max_guests", v as never)} /></Field>
          <Field label="Parking slots"><NumberInput value={form.parking_slots} onChange={(v) => set("parking_slots", v as never)} /></Field>
          <Field label="Indoor capacity"><NumberInput value={form.indoor_capacity} onChange={(v) => set("indoor_capacity", v as never)} /></Field>
          <Field label="Outdoor capacity"><NumberInput value={form.outdoor_capacity} onChange={(v) => set("outdoor_capacity", v as never)} /></Field>
          <Field label="Dining capacity"><NumberInput value={form.dining_capacity} onChange={(v) => set("dining_capacity", v as never)} /></Field>
          <Field label="Rooms for stay"><NumberInput value={form.num_rooms} onChange={(v) => set("num_rooms", v as never)} /></Field>
          <Field label="Changing rooms"><NumberInput value={form.changing_rooms} onChange={(v) => set("changing_rooms", v as never)} /></Field>
        </div>
      </Section>

      {/* Pricing */}
      <Section title="Pricing & policy">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price per day (₹)"><NumberInput value={form.price_per_day} onChange={(v) => set("price_per_day", v as never)} /></Field>
          <Field label="Price per hour (₹)"><NumberInput value={form.price_per_hour} onChange={(v) => set("price_per_hour", v as never)} /></Field>
          <Field label="Advance amount (₹)"><NumberInput value={form.advance_amount} onChange={(v) => set("advance_amount", v as never)} /></Field>
        </div>
        <Field label="Working hours"><Input value={form.working_hours ?? ""} onChange={(v) => set("working_hours", v as never)} placeholder="e.g. 8 AM – 11 PM" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Maximum event duration (hours)"><NumberInput value={extra.max_event_duration_hours as number | undefined} onChange={(v) => setExtra("max_event_duration_hours", v as never)} /></Field>
          <Field label="Extra-hour charges (₹ per hour, beyond max duration)"><NumberInput value={extra.extra_hour_charge as number | undefined} onChange={(v) => setExtra("extra_hour_charge", v as never)} /></Field>
        </div>
        <Field label="Cancellation policy"><Textarea value={form.cancellation_policy ?? ""} onChange={(v) => set("cancellation_policy", v as never)} /></Field>
      </Section>

      {/* Amenities */}
      <Section title="Amenities">
        <p className="-mt-2 text-xs text-muted-foreground">
          Only the amenities you switch on here are shown to customers. Add anything specific to your venue at the bottom.
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set([...FACILITY_OPTIONS, ...Object.keys(facilities)])).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleFacility(name)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                facilities[name] ? "border-brand-violet bg-brand-violet text-white" : "border-border bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <CustomFacilityInput
          onAdd={(name: string) => {
            const current = (form.facilities as Record<string, boolean>) ?? {};
            set("facilities", { ...current, [name]: true } as never);
          }}
        />
      </Section>

      {/* Services — in-house vs "book separately" per vendor category */}
      <Section title="Services">
        <p className="-mt-2 text-xs text-muted-foreground">
          For each service you provide in-house, add the actual choices — menu items for Caterer, decoration packages for Decorator, and so on — so the customer picks exactly what they want instead of one fixed price. Leave a category OFF if you don't provide it — customers get a "book separately" link to hire a vendor for it instead.
        </p>
        <div className="space-y-3">
          {VENDOR_CATEGORIES.map((cat) => {
            const svc = serviceOfferings[cat] ?? { in_house: false, price: null, options: [] };
            return (
              <div key={cat} className="rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 space-y-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleService(cat)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition shrink-0 ${
                      svc.in_house ? "border-brand-violet bg-brand-violet text-white" : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {svc.in_house ? "Provided in-house" : "Not provided"}
                  </button>
                  <span className="text-sm font-medium flex-1 min-w-[120px]">{cat}</span>
                  {svc.in_house && (svc.options ?? []).length === 0 && (
                    <div className="w-40">
                      <NumberInput value={svc.price} onChange={(v) => setServicePrice(cat, v)} />
                    </div>
                  )}
                </div>

                {svc.in_house && (
                  <div className="pl-1 space-y-2">
                    {(svc.options ?? []).length > 0 && (
                      <div className="space-y-1">
                        {svc.options.map((o) => (
                          <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-1.5 text-xs">
                            <span>{o.name}</span>
                            <span className="flex items-center gap-2">
                              <span className="font-semibold">₹{o.price.toLocaleString("en-IN")}{o.per_guest ? " / guest" : ""}</span>
                              <button type="button" onClick={() => removeServiceOption(cat, o.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <ServiceOptionInput onAdd={(name, price, perGuest) => addServiceOption(cat, name, price, perGuest)} />
                    <p className="text-[11px] text-muted-foreground">
                      {(svc.options ?? []).length > 0
                        ? "Customer picks and combines whichever of the above they want — total updates live."
                        : "No specific choices added yet — customer sees the flat price above instead."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Additional details */}
      <Section title="Additional details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nearby landmark / how to reach">
            <Input value={extra.nearby_landmark as string ?? ""} onChange={(v) => setExtra("nearby_landmark", v)} placeholder="e.g. 500m from City Railway Station" />
          </Field>
          <Field label="Google Maps link">
            <Input value={extra.google_maps_link as string ?? ""} onChange={(v) => setExtra("google_maps_link", v)} placeholder="https://maps.google.com/…" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catering policy">
            <Select value={extra.catering_policy as string ?? ""} onChange={(v) => setExtra("catering_policy", v)}
              options={["In-house catering only", "Outside caterers allowed", "Both allowed"]} />
          </Field>
          <Field label="Decoration policy">
            <Select value={extra.decoration_policy as string ?? ""} onChange={(v) => setExtra("decoration_policy", v)}
              options={["In-house decorator only", "Outside decorators allowed", "Both allowed"]} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Alcohol permitted">
            <Select value={extra.alcohol_policy as string ?? ""} onChange={(v) => setExtra("alcohol_policy", v)}
              options={["Not allowed", "Allowed with license", "Allowed"]} />
          </Field>
          <Field label="Music / DJ curfew">
            <Input value={extra.music_curfew as string ?? ""} onChange={(v) => setExtra("music_curfew", v)} placeholder="e.g. Until 10:30 PM" />
          </Field>
          <Field label="Power backup">
            <Select value={extra.power_backup as string ?? ""} onChange={(v) => setExtra("power_backup", v)}
              options={["Full backup included", "Partial backup", "Not available"]} />
          </Field>
        </div>
        <Field label="Event types you host">
          <div className="flex flex-wrap gap-2">
            {["Wedding", "Engagement", "Reception", "Birthday", "Corporate", "Anniversary", "Baby Shower", "Other"].map((type) => {
              const list = (extra.event_types as string[]) ?? [];
              const on = list.includes(type);
              return (
                <button key={type} type="button"
                  onClick={() => setExtra("event_types", on ? list.filter((t) => t !== type) : [...list, type])}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${on ? "border-brand-violet bg-brand-violet text-white" : "border-border bg-background text-muted-foreground hover:bg-accent"}`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram handle">
            <Input value={extra.instagram as string ?? ""} onChange={(v) => setExtra("instagram", v)} placeholder="@yourvenue" />
          </Field>
          <Field label="Facebook page">
            <Input value={extra.facebook as string ?? ""} onChange={(v) => setExtra("facebook", v)} placeholder="facebook.com/yourvenue" />
          </Field>
        </div>
        <Field label="Anything else customers should know">
          <Textarea value={extra.extra_notes as string ?? ""} onChange={(v) => setExtra("extra_notes", v)} />
        </Field>
      </Section>

      {/* Compliance & Verification — GST is optional (not every venue is
          GST-registered); the two proofs feed straight into the same
          `documents` list the admin Verification Center already reviews. */}
      <Section title="Compliance & Verification">
        <p className="-mt-2 text-xs text-muted-foreground">These help the admin team verify your venue faster. GST is only needed if your venue is GST-registered.</p>
        <Field label="GST number / business registration number (if applicable)">
          <Input value={extra.gst_number as string ?? ""} onChange={(v) => setExtra("gst_number", v)} placeholder="e.g. 27ABCDE1234F1Z5" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <DocField label="Ownership / authorization proof" docName="Ownership/Authorization Proof"
            documents={(form.documents as { name: string; url: string }[]) ?? []}
            uploading={uploading === "doc-ownership"} onUpload={async (f) => {
              const url = await upload("hall-media", "doc-ownership", f);
              if (url) setDocument("Ownership/Authorization Proof", url);
            }} />
          <DocField label="Owner identity verification (Aadhaar / PAN / etc.)" docName="Owner Identity Proof"
            documents={(form.documents as { name: string; url: string }[]) ?? []}
            uploading={uploading === "doc-identity"} onUpload={async (f) => {
              const url = await upload("hall-media", "doc-identity", f);
              if (url) setDocument("Owner Identity Proof", url);
            }} />
        </div>
      </Section>

      {/* Media */}
      <Section title="Photos & videos">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Logo</label>
            <FileInput accept="image/*" uploading={uploading === "logo"} previewUrl={form.logo_url ?? undefined}
              onFile={async (f) => { const url = await upload("hall-media", "logo", f); if (url) set("logo_url", url as never); }} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Cover photo</label>
            <FileInput accept="image/*" uploading={uploading === "cover"} previewUrl={form.cover_url ?? undefined}
              onFile={async (f) => { const url = await upload("hall-media", "cover", f); if (url) set("cover_url", url as never); }} />
          </div>
        </div>
        <MediaGrid label="Gallery" bucket="hall-media" prefix="gallery" values={(form.gallery as string[]) ?? []} onChange={(v) => set("gallery", v as never)} upload={upload} uploading={uploading} />
        <MediaGrid label="Stage photos" bucket="hall-media" prefix="stage" values={(form.stage_photos as string[]) ?? []} onChange={(v) => set("stage_photos", v as never)} upload={upload} uploading={uploading} />
        <MediaGrid label="Dining area photos" bucket="hall-media" prefix="dining" values={(form.dining_photos as string[]) ?? []} onChange={(v) => set("dining_photos", v as never)} upload={upload} uploading={uploading} />
        <MediaGrid label="Parking photos" bucket="hall-media" prefix="parking" values={(form.parking_photos as string[]) ?? []} onChange={(v) => set("parking_photos", v as never)} upload={upload} uploading={uploading} />
        <MediaGrid label="Guest rooms photos" bucket="hall-media" prefix="room" values={(form.room_photos as string[]) ?? []} onChange={(v) => set("room_photos", v as never)} upload={upload} uploading={uploading} />
      </Section>

      {/* Payout — private bank/UPI details the platform uses to pay the venue owner. Never shown to customers (customer-facing payment fields were removed — see commit notes). */}
      <PayoutSection />

      {form.id && (
        <PublicProfileCard
          role="venue" entityId={form.id} variant={null} name={(form.name as string) ?? ""}
          active={!!(form as unknown as Hall).public_profile_active} slug={(form.slug as string) ?? null}
          verificationApproved={form.verification_status === "approved"}
          trialEndsAt={(form as unknown as Hall).trial_ends_at ?? null}
          subscriptionActive={(form as unknown as Hall).subscription_active ?? false}
          subscriptionExpiresAt={(form as unknown as Hall).subscription_expires_at ?? null}
          onActivated={(slug) => { set("public_profile_active", true); set("slug", slug); }}
          onSubscribed={(expiresAt) => { set("subscription_active", true); set("subscription_expires_at", expiresAt); }}
        />
      )}

      <ProfileHistoryPanel entityType="halls" entityId={form.id} />

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:pl-72">
        {form.verification_status !== "approved" && (
          <div className="mx-auto max-w-5xl px-4 pt-2 md:px-8">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={partnerTermsChecked} onChange={(e) => setPartnerTermsChecked(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input accent-[color:var(--brand-violet)]" />
              I accept the <a href="/partner-terms" target="_blank" rel="noreferrer" className="text-brand-violet underline">Partner Terms</a>
            </label>
          </div>
        )}
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 py-3 md:px-8">
          <button disabled={saving} onClick={() => handleSave()} className="flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save progress
          </button>
          {form.verification_status === "approved" ? (
            // Already verified — this is now just a visibility toggle, not a re-verification trigger.
            form.status === "published" ? (
              <button disabled={saving} onClick={() => handleSave(false)} className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-50">
                <EyeOff className="h-4 w-4" /> Hide from marketplace
              </button>
            ) : (
              <button disabled={saving} onClick={() => handleSave(true)} className="flex items-center gap-1.5 rounded-full bg-brand-violet px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                <Eye className="h-4 w-4" /> Show on marketplace
              </button>
            )
          ) : (
            <button disabled={saving || !partnerTermsChecked} onClick={() => handleSave(true)} className="flex items-center gap-1.5 rounded-full bg-brand-violet px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Submit for verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- small shared UI helpers (same pattern as worker/profile.tsx) ---------- */

function PayoutSection() {
  const qc = useQueryClient();
  const [upi, setUpi] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["venue-owner-payout"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase.from("profiles").select("payout_upi_id").eq("id", userData.user.id).maybeSingle();
      return data as { payout_upi_id: string | null } | null;
    },
  });

  useEffect(() => {
    if (profile && !loaded) { setUpi(profile.payout_upi_id ?? ""); setLoaded(true); }
  }, [profile, loaded]);

  const save = useMutation({
    mutationFn: async (value: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({ payout_upi_id: value }).eq("id", userData.user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payout details saved"); qc.invalidateQueries({ queryKey: ["venue-owner-payout"] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <Section title="Payout details">
      <p className="-mt-2 text-xs text-muted-foreground">Private — only used by EventOrbit Nova to pay you your share of bookings. Never shown to customers (that's the separate "UPI for advance payment" field above).</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">UPI ID</label>
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
            <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
            <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@okhdfcbank" className="w-full bg-transparent text-sm outline-none" />
          </div>
        </div>
        <button onClick={() => save.mutate(upi.trim())} disabled={save.isPending || !upi.trim()}
          className="flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </button>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function DocField({ label, docName, documents, uploading, onUpload }: {
  label: string; docName: string; documents: { name: string; url: string }[]; uploading?: boolean; onUpload: (f: File) => void;
}) {
  const existing = documents.find((d) => d.name === docName);
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {existing && (
          <a href={existing.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <FileCheck className="h-3.5 w-3.5" /> Uploaded
          </a>
        )}
        <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-input px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {existing ? "Replace file" : "Upload file"}
          <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
        </label>
      </div>
    </Field>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet"
    />
  );
}

function NumberInput({ value, onChange }: { value?: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet"
    />
  );
}

function ServiceOptionInput({ onAdd }: { onAdd: (name: string, price: number, perGuest: boolean) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [perGuest, setPerGuest] = useState(false);

  function add() {
    const n = name.trim();
    const p = Number(price);
    if (!n || !price || Number.isNaN(p) || p <= 0) return;
    onAdd(n, p, perGuest);
    setName(""); setPrice(""); setPerGuest(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Paneer Butter Masala, Floral stage decor"
        className="min-w-[14rem] flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-brand-violet"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder="Price ₹"
        inputMode="numeric"
        className="w-24 rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-brand-violet"
      />
      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <input type="checkbox" checked={perGuest} onChange={(e) => setPerGuest(e.target.checked)} /> per guest
      </label>
      <button type="button" onClick={add} className="rounded-full border border-input px-3 py-1.5 text-[11px] font-semibold hover:bg-accent">Add</button>
    </div>
  );
}

function CustomFacilityInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState("");
  function add() {
    const name = value.trim();
    if (!name) return;
    onAdd(name);
    setValue("");
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        placeholder="Add your own amenity — e.g. Bridal suite, Valet parking"
        className="min-w-[16rem] flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet"
      />
      <button type="button" onClick={add} className="rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent">Add amenity</button>
    </div>
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      rows={3}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet"
    >
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function FileInput({ accept, uploading, onFile, previewUrl }: { accept?: string; uploading?: boolean; onFile: (f: File) => void; previewUrl?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 hover:bg-accent">
      {previewUrl && <img src={previewUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />}
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? "Uploading…" : previewUrl ? "Replace" : "Upload"}
      </span>
      <input type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </label>
  );
}

function MediaGrid({
  label, bucket, prefix, accept = "image/*", values, onChange, upload, uploading,
}: {
  label: string; bucket: string; prefix: string; accept?: string; values: string[]; onChange: (v: string[]) => void;
  upload: (bucket: string, key: string, file: File) => Promise<string | null>; uploading: string | null;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {values.map((url, i) => (
          <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent">
          {uploading === prefix ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="text-[10px] font-semibold">Add</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await upload(bucket, prefix, f); if (url) onChange([...values, url]); } }}
          />
        </label>
      </div>
    </div>
  );
}
