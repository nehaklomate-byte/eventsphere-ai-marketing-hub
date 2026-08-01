import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  HardHat, MapPin, Star, Search, Wallet, Send, X, Loader2, Briefcase, IndianRupee, CheckCircle2, Clock3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { fetchMyHalls } from "@/lib/venue";
import { WORKER_CATEGORIES } from "@/lib/worker";
import { payForWorkerTask } from "@/lib/razorpay";

export const Route = createFileRoute("/_authenticated/venue/hire-workers")({
  head: () => ({ meta: [{ title: "Hire Workers — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: HireWorkersPage,
});

type MarketWorker = {
  id: string; owner_id: string; full_name: string; photo_url: string | null;
  category: string | null; city: string | null; state: string | null;
  years_experience: number | null; rating: number; review_count: number;
  daily_charges: number | null; hourly_charges: number | null;
};

async function fetchVerifiedWorkers(category: string): Promise<MarketWorker[]> {
  let q = supabase.from("workers")
    .select("id,owner_id,full_name,photo_url,category,city,state,years_experience,rating,review_count,daily_charges,hourly_charges")
    .eq("verified", true).eq("marketplace_visible", true).is("deleted_at", null)
    .order("rating", { ascending: false });
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as MarketWorker[]) ?? [];
}

type MyRequest = {
  id: string; task_name: string; event_name: string; event_date: string;
  status: string; payment_status: string; payment_amount: number | null;
  worker: { full_name: string } | null;
};

async function fetchMyRequests(userId: string): Promise<MyRequest[]> {
  const { data, error } = await supabase.from("worker_tasks" as never)
    .select("id,task_name,event_name,event_date,status,payment_status,payment_amount,worker:workers(full_name)")
    .eq("assigned_by" as never, userId as never)
    .order("event_date" as never, { ascending: false }).limit(30);
  if (error) throw error;
  return (data as unknown as MyRequest[]) ?? [];
}

function HireWorkersPage() {
  const { user } = useSession();
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [hireTarget, setHireTarget] = useState<MarketWorker | null>(null);

  const { data: halls = [] } = useQuery({ queryKey: ["my-halls"], queryFn: fetchMyHalls, enabled: !!user?.id });
  const { data: workers = [], isLoading } = useQuery({ queryKey: ["verified-workers", category], queryFn: () => fetchVerifiedWorkers(category) });

  const filtered = workers.filter((w) => !q || w.full_name.toLowerCase().includes(q.toLowerCase()) || (w.city ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Hire Workers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse verified workers and send them a direct booking request for your venue's events — they need to accept before it's confirmed.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or city…"
            className="w-full rounded-full border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-violet" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none">
          <option value="">All categories</option>
          {WORKER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 rounded-2xl bg-card animate-pulse border border-border" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <HardHat className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No verified workers match this search yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => (
            <article key={w.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft flex flex-col">
              <div className="flex items-center gap-3">
                {w.photo_url ? (
                  <img src={w.photo_url} alt={w.full_name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-muted-foreground"><HardHat className="h-5 w-5" /></div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{w.full_name}</h3>
                  <div className="text-xs text-muted-foreground truncate">{w.category ?? "Worker"}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {w.city && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {[w.city, w.state].filter(Boolean).join(", ")}</div>}
                {w.years_experience != null && <div>{w.years_experience}+ yrs experience</div>}
                {w.review_count > 0 && <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" /> {w.rating.toFixed(1)} ({w.review_count})</div>}
                {(w.daily_charges || w.hourly_charges) && (
                  <div className="pt-1 text-sm font-semibold text-foreground">
                    {w.daily_charges ? `₹${w.daily_charges.toLocaleString("en-IN")}/day` : `₹${w.hourly_charges?.toLocaleString("en-IN")}/hr`}
                  </div>
                )}
              </div>
              <button onClick={() => setHireTarget(w)}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3.5 py-2 text-xs font-semibold text-white">
                <Send className="h-3.5 w-3.5" /> Send booking request
              </button>
            </article>
          ))}
        </div>
      )}

      {hireTarget && user?.id && (
        <HirePanel worker={hireTarget} halls={halls} userId={user.id} onClose={() => setHireTarget(null)} />
      )}

      {user?.id && <MyRequests userId={user.id} />}
    </div>
  );
}

function MyRequests({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({ queryKey: ["my-worker-requests", userId], queryFn: () => fetchMyRequests(userId), enabled: !!userId });
  const [payingId, setPayingId] = useState<string | null>(null);

  async function handlePay(r: MyRequest) {
    setPayingId(r.id);
    try {
      await payForWorkerTask({ workerTaskId: r.id });
      toast.success("Payment successful!");
      qc.invalidateQueries({ queryKey: ["my-worker-requests", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPayingId(null);
    }
  }

  if (requests.length === 0) return null;

  const statusTone: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700", accepted: "bg-blue-500/15 text-blue-700",
    in_progress: "bg-blue-500/15 text-blue-700", completed: "bg-emerald-500/15 text-emerald-700",
    rejected: "bg-rose-500/15 text-rose-700", cancelled: "bg-rose-500/15 text-rose-700",
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Your booking requests</h2>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{r.task_name} <span className="text-muted-foreground font-normal">— {r.worker?.full_name ?? "Worker"}</span></div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(r.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusTone[r.status] ?? "bg-muted text-muted-foreground"}`}>{r.status.replace("_", " ")}</span>
                {r.payment_amount != null && <span className="font-semibold text-foreground">₹{r.payment_amount.toLocaleString("en-IN")}</span>}
              </div>
            </div>
            {r.payment_status === "paid" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Paid
              </span>
            ) : (r.status === "accepted" || r.status === "completed") && r.payment_amount ? (
              <button onClick={() => handlePay(r)} disabled={payingId === r.id}
                className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold text-white disabled:opacity-70">
                {payingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IndianRupee className="h-3.5 w-3.5" />} Pay Now
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> Awaiting acceptance
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HirePanel({ worker, halls, userId, onClose }: {
  worker: MarketWorker; halls: { id: string; name: string }[]; userId: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    event_name: "", task_name: "", hall_id: halls[0]?.id ?? "", event_date: "", start_time: "", end_time: "", pay_amount: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.event_name.trim() || !form.task_name.trim() || !form.event_date) {
        throw new Error("Event name, task and date are required.");
      }
      const hall = halls.find((h) => h.id === form.hall_id);
      const { data, error } = await supabase.from("worker_tasks" as never).insert({
        worker_id: worker.id,
        worker_user_id: worker.owner_id,
        assigned_by: userId,
        organization_id: null,
        organization_name: hall?.name ?? "Venue booking",
        event_name: form.event_name.trim(),
        task_name: form.task_name.trim(),
        venue: hall?.name ?? null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        priority: "normal",
        status: "pending",
        payment_amount: form.pay_amount ? Number(form.pay_amount) : null,
      } as never).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Request was blocked — please refresh and try again.");
    },
    onSuccess: () => { toast.success("Booking request sent!"); qc.invalidateQueries({ queryKey: ["verified-workers"] }); onClose(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send request"),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Book {worker.full_name}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">They'll need to accept before this is confirmed.</p>
        <div className="mt-4 space-y-3">
          <input placeholder="Event name" value={form.event_name} onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          <input placeholder="Task (what should they do?)" value={form.task_name} onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          {halls.length > 0 && (
            <select value={form.hall_id} onChange={(e) => setForm((f) => ({ ...f, hall_id: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none">
              {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <input type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
            <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="number" placeholder="Pay amount (₹, optional)" value={form.pay_amount} onChange={(e) => setForm((f) => ({ ...f, pay_amount: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>
        </div>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />} Send booking request
        </button>
      </div>
    </div>
  );
}
