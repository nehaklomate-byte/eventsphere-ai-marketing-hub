import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, MapPin, Star, BadgeCheck, Wrench, Send, Phone, CheckCircle2, Globe, Instagram, Facebook,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { emailSchema, phoneSchema } from "@/lib/validation";

type Vendor = {
  id: string;
  business_name: string;
  owner_full_name: string | null;
  category: string | null;
  years_experience: number | null;
  city: string | null;
  state: string | null;
  address: string | null;
  portfolio: string[];
  price_catalogue_url: string | null;
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  service_areas: string[];
  verified: boolean;
  rating: number;
  review_count: number;
};

export const Route = createFileRoute("/vendor/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Vendor details — EventOrbit AI" },
      { name: "description", content: "Verified event vendor on EventOrbit AI." },
      { property: "og:url", content: `/vendor/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/vendor/${params.id}` }],
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("vendors").select("*").eq("id", params.id).eq("status", "published").is("deleted_at", null).maybeSingle();
    if (error || !data) throw notFound();
    return { vendor: data as unknown as Vendor };
  },
  component: VendorDetail,
});

const enquirySchema = z.object({
  contact_name: z.string().min(2, "Enter your name"),
  contact_email: emailSchema,
  contact_phone: phoneSchema.optional().or(z.literal("")),
  event_date: z.string().min(1, "Pick a date"),
  message: z.string().optional(),
});

function VendorDetail() {
  const { vendor } = Route.useLoaderData();

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-10">
        <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-start gap-4">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt={vendor.business_name} className="h-20 w-20 rounded-2xl object-cover border border-border" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-accent text-muted-foreground"><Wrench className="h-8 w-8" /></div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl md:text-3xl font-semibold">{vendor.business_name}</h1>
                  {vendor.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-semibold px-2.5 py-1">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {vendor.category && <span>{vendor.category}</span>}
                  {vendor.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[vendor.city, vendor.state].filter(Boolean).join(", ")}</span>}
                  {vendor.years_experience != null && <span>{vendor.years_experience}+ yrs experience</span>}
                  {vendor.review_count > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />{vendor.rating.toFixed(1)} ({vendor.review_count})</span>}
                </div>
              </div>
            </div>

            {vendor.portfolio?.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold mb-3">Portfolio</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(vendor.portfolio as string[]).map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Work ${i + 1}`} className="h-32 w-full rounded-xl object-cover border border-border" />
                  ))}
                </div>
              </div>
            )}

            {vendor.service_areas?.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold mb-2">Service areas</h2>
                <div className="flex flex-wrap gap-2">
                  {(vendor.service_areas as string[]).map((a: string) => <span key={a} className="rounded-full bg-accent px-3 py-1 text-xs font-medium">{a}</span>)}
                </div>
              </div>
            )}

            {(vendor.website || vendor.instagram || vendor.facebook) && (
              <div className="mt-8 flex flex-wrap gap-4 text-sm">
                {vendor.website && <a href={vendor.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-violet hover:underline"><Globe className="h-4 w-4" /> Website</a>}
                {vendor.instagram && <a href={vendor.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-violet hover:underline"><Instagram className="h-4 w-4" /> Instagram</a>}
                {vendor.facebook && <a href={vendor.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-violet hover:underline"><Facebook className="h-4 w-4" /> Facebook</a>}
              </div>
            )}
          </div>

          <div>
            <EnquiryCard vendorId={vendor.id} />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function EnquiryCard({ vendorId }: { vendorId: string }) {
  const [state, setState] = useState({ contact_name: "", contact_email: "", contact_phone: "", event_date: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({}); setErr(null);
    const parsed = enquirySchema.safeParse(state);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      setErrors(fe); return;
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("enquiries").insert({
      vendor_id: vendorId,
      requester_id: userRes.user?.id ?? null,
      contact_name: parsed.data.contact_name,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone || null,
      event_date: parsed.data.event_date,
      message: parsed.data.message || null,
    });
    setSubmitting(false);
    if (error) { setErr("Could not send enquiry. Please try again."); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-brand-violet/30 bg-accent/40 p-5 text-sm sticky top-24">
        <div className="flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Enquiry sent!</div>
        <p className="mt-1.5 text-muted-foreground">The vendor will get back to you shortly. Our team monitors every enquiry too.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-soft sticky top-24 space-y-3">
      <h3 className="font-display text-lg font-semibold">Enquire with this vendor</h3>
      <div>
        <input placeholder="Your name" value={state.contact_name} onChange={(e) => setState((s) => ({ ...s, contact_name: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        {errors.contact_name && <p className="mt-1 text-xs text-destructive">{errors.contact_name}</p>}
      </div>
      <div>
        <input type="email" placeholder="Email" value={state.contact_email} onChange={(e) => setState((s) => ({ ...s, contact_email: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        {errors.contact_email && <p className="mt-1 text-xs text-destructive">{errors.contact_email}</p>}
      </div>
      <div className="relative">
        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input placeholder="Phone (optional)" value={state.contact_phone} onChange={(e) => setState((s) => ({ ...s, contact_phone: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      </div>
      <div>
        <input type="date" value={state.event_date} onChange={(e) => setState((s) => ({ ...s, event_date: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        {errors.event_date && <p className="mt-1 text-xs text-destructive">{errors.event_date}</p>}
      </div>
      <textarea placeholder="What do you need for your event?" rows={3} value={state.message} onChange={(e) => setState((s) => ({ ...s, message: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
        <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
