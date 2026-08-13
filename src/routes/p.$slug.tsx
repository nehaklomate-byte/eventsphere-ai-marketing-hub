import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Star, BadgeCheck, Loader2, Send, CheckCircle2, Sparkles, Phone } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicProfileBySlug } from "@/lib/publicProfile";
import { emailSchema, phoneSchema } from "@/lib/validation";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const result = await fetchPublicProfileBySlug(params.slug);
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${nameOf(loaderData)} — Book on EventOrbit Nova` : "EventOrbit Nova" }],
  }),
  component: PublicProfilePage,
});

function nameOf(d: { role: string; entity: Record<string, unknown> }): string {
  return (d.entity.name as string) || (d.entity.business_name as string) || (d.entity.full_name as string) || "Provider";
}

function PublicProfilePage() {
  const data = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { role, entity } = data;
  const name = nameOf(data);
  const photo = (entity.cover_url as string) || (entity.photo_url as string) || (entity.logo_url as string) || (entity.agency_logo_url as string) || null;
  const gallery: string[] = (entity.gallery as string[]) || (entity.portfolio as string[]) || (entity.work_images as string[]) || [];
  const city = entity.city as string | null;
  const state = entity.state as string | null;
  const category = entity.category as string | null;
  const rating = (entity.rating as number) ?? 0;
  const reviewCount = (entity.review_count as number) ?? 0;

  return (
    <SiteLayout>
      <section className="relative h-[42vh] min-h-[300px] w-full overflow-hidden bg-accent">
        {photo ? (
          <img src={photo} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-brand text-white text-4xl font-bold">{name[0]}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
              <Sparkles className="h-3.5 w-3.5" /> Book on EventOrbit Nova
            </div>
            <h1 className="mt-1 font-display text-3xl md:text-4xl font-bold">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/90">
              {category && <span className="rounded-full bg-white/15 px-3 py-1">{category}</span>}
              {(city || state) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[city, state].filter(Boolean).join(", ")}</span>}
              {rating > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {rating.toFixed(1)} ({reviewCount})</span>}
              {entity.verified ? <span className="flex items-center gap-1 text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 md:px-8 py-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {(entity.description || entity.bio) ? (
            <Card title="About">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entity.description as string) || (entity.bio as string)}</p>
            </Card>
          ) : null}

          {gallery.length > 0 && (
            <Card title="Photos">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gallery.slice(0, 10).map((src, i) => (
                  <div key={i} className="aspect-[16/11] overflow-hidden rounded-xl border border-border">
                    <img src={src} alt={`${name} ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {role === "venue" && (entity.price_per_day || entity.price_per_hour) ? (
            <Card title="Pricing">
              <div className="flex flex-wrap gap-4 text-sm">
                {entity.price_per_day ? <div><div className="text-muted-foreground">Per day</div><div className="text-lg font-bold">₹{Number(entity.price_per_day).toLocaleString("en-IN")}</div></div> : null}
                {entity.price_per_hour ? <div><div className="text-muted-foreground">Per hour</div><div className="text-lg font-bold">₹{Number(entity.price_per_hour).toLocaleString("en-IN")}</div></div> : null}
              </div>
            </Card>
          ) : null}

          {(entity.cancellation_policy || entity.payment_terms) ? (
            <Card title="Booking policy">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(entity.cancellation_policy as string) || (entity.payment_terms as string)}</p>
            </Card>
          ) : null}
        </div>

        <div>
          <EnquiryCard role={role} entityId={entity.id as string} slug={slug} name={name} />
        </div>
      </section>
    </SiteLayout>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function EnquiryCard({ role, entityId, slug, name }: { role: string; entityId: string; slug: string; name: string }) {
  const [form, setForm] = useState({ contact_name: "", contact_email: "", contact_phone: "", event_date: "", message: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.contact_name.trim()) throw new Error("Please enter your name");
      const emailCheck = emailSchema.safeParse(form.contact_email);
      if (!emailCheck.success) throw new Error("Please enter a valid email");
      if (form.contact_phone && !phoneSchema.safeParse(form.contact_phone).success) throw new Error("Please enter a valid phone number");

      const row: Record<string, unknown> = {
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim() || null,
        event_date: form.event_date || null,
        message: form.message.trim() || null,
        booking_source: "public_profile_link",
        source_slug: slug,
      };
      if (role === "venue") row.hall_id = entityId;
      if (role === "vendor") row.vendor_id = entityId;
      if (role === "worker") row.worker_id = entityId;

      const { error } = await supabase.from("enquiries" as never).insert(row as never);
      if (error) throw error;
    },
    onSuccess: () => setSent(true),
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Could not send enquiry"),
  });

  if (sent) {
    return (
      <div className="sticky top-24 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <p className="mt-2 text-sm font-semibold">Enquiry sent!</p>
        <p className="mt-1 text-xs text-muted-foreground">{name} will get back to you soon via EventOrbit Nova.</p>
      </div>
    );
  }

  return (
    <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h3 className="font-display text-lg font-semibold">Check availability</h3>
      <p className="mt-1 text-xs text-muted-foreground">Send an enquiry — stays inside EventOrbit Nova so your booking, payment and confirmation are all protected.</p>
      <div className="mt-4 space-y-3">
        <input value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} placeholder="Your name"
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        <input value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} placeholder="Email" type="email"
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        <input value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} placeholder="Phone (optional)"
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        <input value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} type="date"
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="What are you planning?" rows={3}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet resize-none" />
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <button onClick={() => { setErr(null); submit.mutate(); }} disabled={submit.isPending}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
          {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send enquiry
        </button>
      </div>
    </div>
  );
}
