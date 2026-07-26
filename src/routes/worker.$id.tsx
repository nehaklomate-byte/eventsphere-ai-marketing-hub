import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, MapPin, Star, BadgeCheck, HardHat, Send, CheckCircle2, Wallet, Clock, Languages,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

type WorkerProfile = {
  id: string;
  owner_id: string;
  full_name: string;
  photo_url: string | null;
  category: string | null;
  skills: string[];
  years_experience: number | null;
  languages: string[];
  city: string | null;
  state: string | null;
  work_images: string[];
  bio: string | null;
  daily_charges: number | null;
  hourly_charges: number | null;
  payment_type: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  verified: boolean;
  rating: number;
  review_count: number;
};

export const Route = createFileRoute("/worker/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Worker profile — EventSphere AI" },
      { name: "description", content: "Verified event worker on EventSphere AI." },
      { property: "og:url", content: `/worker/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/worker/${params.id}` }],
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("workers").select("*").eq("id", params.id).eq("verified", true).eq("marketplace_visible", true).is("deleted_at", null).maybeSingle();
    if (error || !data) throw notFound();
    return { worker: data as unknown as WorkerProfile };
  },
  component: WorkerDetail,
});

function WorkerDetail() {
  const { worker } = Route.useLoaderData();

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-10">
        <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-start gap-4">
              {worker.photo_url ? (
                <img src={worker.photo_url} alt={worker.full_name} className="h-20 w-20 rounded-full object-cover border border-border" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-full bg-accent text-muted-foreground"><HardHat className="h-8 w-8" /></div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl md:text-3xl font-semibold">{worker.full_name}</h1>
                  {worker.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-semibold px-2.5 py-1">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {worker.category && <span>{worker.category}</span>}
                  {worker.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[worker.city, worker.state].filter(Boolean).join(", ")}</span>}
                  {worker.years_experience != null && <span>{worker.years_experience}+ yrs experience</span>}
                  {worker.review_count > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" />{worker.rating.toFixed(1)} ({worker.review_count})</span>}
                </div>
              </div>
            </div>

            {worker.bio && <p className="mt-6 text-sm text-muted-foreground leading-relaxed">{worker.bio}</p>}

            {worker.skills?.length > 0 && (
              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold mb-2">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((s) => <span key={s} className="rounded-full bg-accent px-3 py-1 text-xs font-medium">{s}</span>)}
                </div>
              </div>
            )}

            {worker.languages?.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Languages className="h-4 w-4" /> {worker.languages.join(", ")}
              </div>
            )}

            {(worker.working_hours_start || worker.working_hours_end) && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Available {worker.working_hours_start ?? "—"} – {worker.working_hours_end ?? "—"}
              </div>
            )}

            {worker.work_images?.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-semibold mb-3">Work photos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {worker.work_images.map((url, i) => (
                    <img key={i} src={url} alt={`Work ${i + 1}`} className="h-32 w-full rounded-xl object-cover border border-border" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <HireCard worker={worker} />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function HireCard({ worker }: { worker: WorkerProfile }) {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [state, setState] = useState({ event_name: "", task_name: "", venue: "", venue_address: "", event_date: "", start_time: "", end_time: "", pay_amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user)); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!state.event_name.trim() || !state.task_name.trim() || !state.event_date) {
      setErr("Event name, task and date are required.");
      return;
    }
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { setSubmitting(false); setErr("Please log in first."); return; }

    const { error } = await supabase.from("worker_tasks" as never).insert({
      worker_id: worker.id,
      worker_user_id: worker.owner_id,
      assigned_by: userRes.user.id,
      organization_id: null,
      organization_name: "Direct booking",
      event_name: state.event_name.trim(),
      task_name: state.task_name.trim(),
      venue: state.venue || null,
      venue_address: state.venue_address || null,
      event_date: state.event_date,
      start_time: state.start_time || null,
      end_time: state.end_time || null,
      priority: "normal",
      status: "pending",
      payment_amount: state.pay_amount ? Number(state.pay_amount) : null,
    } as never);
    setSubmitting(false);
    if (error) { setErr("Could not send the request. Please try again."); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-brand-violet/30 bg-accent/40 p-5 text-sm sticky top-24">
        <div className="flex items-center gap-2 font-semibold text-foreground"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Request sent!</div>
        <p className="mt-1.5 text-muted-foreground">{worker.full_name} will accept or decline from their dashboard — you'll be notified either way.</p>
      </div>
    );
  }

  if (loggedIn === false) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sticky top-24 text-sm">
        <h3 className="font-display text-lg font-semibold">Book {worker.full_name}</h3>
        <p className="mt-2 text-muted-foreground">Log in to send a direct booking request — this becomes a real job on their dashboard once they accept.</p>
        <button onClick={() => navigate({ to: "/login" })} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold">
          Log in to book
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-soft sticky top-24 space-y-3">
      <h3 className="font-display text-lg font-semibold">Book {worker.full_name}</h3>
      <p className="text-xs text-muted-foreground -mt-1">They'll need to accept before this becomes confirmed work.</p>
      <input placeholder="Event name" value={state.event_name} onChange={(e) => setState((s) => ({ ...s, event_name: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <input placeholder="What should they do? (task)" value={state.task_name} onChange={(e) => setState((s) => ({ ...s, task_name: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <input placeholder="Venue name (optional)" value={state.venue} onChange={(e) => setState((s) => ({ ...s, venue: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <input type="date" value={state.event_date} onChange={(e) => setState((s) => ({ ...s, event_date: e.target.value }))}
        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      <div className="grid grid-cols-2 gap-2">
        <input type="time" value={state.start_time} onChange={(e) => setState((s) => ({ ...s, start_time: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        <input type="time" value={state.end_time} onChange={(e) => setState((s) => ({ ...s, end_time: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      </div>
      <div className="relative">
        <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="number" placeholder="Pay amount (₹, optional)" value={state.pay_amount} onChange={(e) => setState((s) => ({ ...s, pay_amount: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
        <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send booking request"}
      </button>
    </form>
  );
}
