import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  HardHat, MapPin, Star, Search, Wallet, Send, X, Loader2, Briefcase, IndianRupee, CheckCircle2, Clock3,
  ImageIcon, AlertTriangle, Paperclip, MessageSquareWarning, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { fetchMyHalls, fetchHallBookings, type HallBooking } from "@/lib/venue";
import { WORKER_CATEGORIES, isVideoUrl, acceptWorkerCounter, rejectWorkerCounter } from "@/lib/worker";
import { payForWorkerTask } from "@/lib/razorpay";
import { notifyUsers } from "@/lib/push";

export const Route = createFileRoute("/_authenticated/venue/hire-workers")({
  head: () => ({ meta: [{ title: "Hire Workers — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: HireWorkersPage,
});

type RequestedService = { category: string; name: string; requirement_note?: string | null };
type Attachment = { url: string; name: string; type: string; size: number };
type PricingUnit = "per_worker" | "per_day" | "per_shift" | "per_job";
const PRICING_UNIT_LABEL: Record<PricingUnit, string> = {
  per_worker: "per worker", per_day: "per day", per_shift: "per shift", per_job: "per job",
};

type MarketWorker = {
  id: string; owner_id: string; full_name: string; photo_url: string | null;
  category: string | null; city: string | null; state: string | null;
  years_experience: number | null; rating: number; review_count: number;
  daily_charges: number | null; hourly_charges: number | null;
};

async function fetchVerifiedWorkers(category: string): Promise<MarketWorker[]> {
  let q = supabase.from("workers")
    .select("id,owner_id,full_name,photo_url,category,city,state,years_experience,rating,review_count,daily_charges,hourly_charges")
    .eq("verified", true).eq("status", "published").is("deleted_at", null)
    .order("rating", { ascending: false });
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as MarketWorker[]) ?? [];
}

type MyRequest = {
  id: string; task_name: string; event_name: string; event_date: string;
  status: string; payment_status: string; payment_amount: number | null;
  service_category: string | null; service_name: string | null; quantity: number; pricing_unit: PricingUnit;
  proposed_fee: number | null; final_fee: number | null;
  counter_offer_amount: number | null; counter_offer_note: string | null;
  check_in_photo_url: string | null; check_out_photo_url: string | null; completion_photo_urls: string[] | null;
  completion_notes: string | null;
  worker: { full_name: string } | null;
};

async function fetchMyRequests(userId: string): Promise<MyRequest[]> {
  const { data, error } = await supabase.from("worker_tasks" as never)
    .select("id,task_name,event_name,event_date,status,payment_status,payment_amount,service_category,service_name,quantity,pricing_unit,proposed_fee,final_fee,counter_offer_amount,counter_offer_note,check_in_photo_url,check_out_photo_url,completion_photo_urls,completion_notes,worker:workers(full_name)")
    .eq("assigned_by" as never, userId as never)
    .order("event_date" as never, { ascending: false }).limit(30);
  if (error) throw error;
  return (data as unknown as MyRequest[]) ?? [];
}

// Duplicate-hiring prevention (spec Part 30) — active worker assignments
// already on this booking, grouped by job role.
async function fetchAssignedServices(bookingId: string): Promise<Record<string, { full_name: string; status: string }[]>> {
  if (!bookingId) return {};
  const { data, error } = await supabase.from("worker_tasks" as never)
    .select("service_category,service_name,status,worker:workers(full_name)")
    .eq("customer_booking_id" as never, bookingId as never)
    .not("status" as never, "in" as never, "(rejected,cancelled)" as never);
  if (error) throw error;
  const map: Record<string, { full_name: string; status: string }[]> = {};
  ((data ?? []) as unknown as { service_category: string | null; service_name: string | null; status: string; worker: { full_name: string } | null }[]).forEach((row) => {
    const key = `${row.service_category ?? ""}|${row.service_name ?? ""}`;
    if (!map[key]) map[key] = [];
    map[key].push({ full_name: row.worker?.full_name ?? "Worker", status: row.status });
  });
  return map;
}

function HireWorkersPage() {
  const { user } = useSession();
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [hireTarget, setHireTarget] = useState<MarketWorker | null>(null);

  const { data: halls = [] } = useQuery({ queryKey: ["my-halls"], queryFn: fetchMyHalls, enabled: !!user?.id });
  const { data: bookings = [] } = useQuery({
    queryKey: ["my-hall-bookings-for-hire", halls.map((h) => h.id).join(",")],
    queryFn: () => fetchHallBookings(halls.map((h) => h.id)),
    enabled: halls.length > 0,
  });
  const { data: workers = [], isLoading } = useQuery({ queryKey: ["verified-workers", category], queryFn: () => fetchVerifiedWorkers(category) });

  const filtered = workers.filter((w) => !q || w.full_name.toLowerCase().includes(q.toLowerCase()) || (w.city ?? "").toLowerCase().includes(q.toLowerCase()));
  const confirmedBookings = bookings.filter((b) => b.status !== "cancelled" && b.status !== "pending");

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
              <div className="mt-4 flex gap-2">
                <Link to="/worker/$id" params={{ id: w.id }} target="_blank"
                  className="flex-1 inline-flex items-center justify-center rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent">
                  View full profile
                </Link>
                <button onClick={() => setHireTarget(w)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3.5 py-2 text-xs font-semibold text-white">
                  <Send className="h-3.5 w-3.5" /> Send request
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {hireTarget && user?.id && (
        <HirePanel worker={hireTarget} bookings={confirmedBookings} userId={user.id} onClose={() => setHireTarget(null)} />
      )}

      {user?.id && <MyRequests userId={user.id} />}
    </div>
  );
}

function MyRequests({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({ queryKey: ["my-worker-requests", userId], queryFn: () => fetchMyRequests(userId), enabled: !!userId });
  const [payingId, setPayingId] = useState<string | null>(null);
  const [openProofId, setOpenProofId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handlePay(r: MyRequest) {
    setPayingId(r.id);
    try {
      await payForWorkerTask({ workerTaskId: r.id, entityType: "worker" });
      toast.success("Payment successful!");
      qc.invalidateQueries({ queryKey: ["my-worker-requests", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPayingId(null);
    }
  }

  async function respondToCounter(r: MyRequest, accept: boolean) {
    setBusyId(r.id);
    try {
      if (accept) {
        await acceptWorkerCounter(r.id);
        toast.success(`Accepted ₹${(r.counter_offer_amount ?? 0).toLocaleString("en-IN")} — assignment confirmed`);
      } else {
        await rejectWorkerCounter(r.id, "Counter offer declined by venue owner");
        toast.success("Counter offer declined");
      }
      qc.invalidateQueries({ queryKey: ["my-worker-requests", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not respond to the counter offer");
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  const statusTone: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700", countered: "bg-purple-500/15 text-purple-700", accepted: "bg-blue-500/15 text-blue-700",
    in_progress: "bg-blue-500/15 text-blue-700", completed: "bg-emerald-500/15 text-emerald-700",
    rejected: "bg-rose-500/15 text-rose-700", cancelled: "bg-rose-500/15 text-rose-700",
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Your booking requests</h2>
      <div className="space-y-2">
        {requests.map((r) => {
          const hasProof = r.check_in_photo_url || r.check_out_photo_url || (r.completion_photo_urls?.length ?? 0) > 0;
          const currentFee = r.final_fee ?? r.proposed_fee ?? r.payment_amount;
          return (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {r.task_name} <span className="text-muted-foreground font-normal">— {r.worker?.full_name ?? "Worker"}</span>
                  {r.quantity > 1 && <span className="ml-2 text-muted-foreground font-normal">× {r.quantity}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(r.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusTone[r.status] ?? "bg-muted text-muted-foreground"}`}>{r.status.replace("_", " ")}</span>
                  {currentFee != null && <span className="font-semibold text-foreground">₹{currentFee.toLocaleString("en-IN")} {r.final_fee == null ? "(proposed)" : "(agreed)"}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasProof && (
                  <button onClick={() => setOpenProofId(openProofId === r.id ? null : r.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                    <ImageIcon className="h-3.5 w-3.5" /> {openProofId === r.id ? "Hide proof" : "View proof"}
                  </button>
                )}
                {r.payment_status === "paid" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                    </span>
                    <Link to="/receipt/$type/$id" params={{ type: "worker", id: r.id }} target="_blank"
                      className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">Receipt</Link>
                  </span>
                ) : (r.status === "accepted" || r.status === "completed") && r.payment_amount ? (
                  <button onClick={() => handlePay(r)} disabled={payingId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold text-white disabled:opacity-70">
                    {payingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IndianRupee className="h-3.5 w-3.5" />} Pay Now
                  </button>
                ) : r.status === "countered" ? null : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" /> Awaiting response
                  </span>
                )}
              </div>
            </div>

            {r.status === "countered" && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-300/60 bg-purple-50 dark:bg-purple-950/20 px-4 py-3">
                <div className="text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300"><MessageSquareWarning className="h-3.5 w-3.5" /> Countered: ₹{(r.counter_offer_amount ?? 0).toLocaleString("en-IN")}</span>
                  {r.counter_offer_note && <p className="mt-1 text-xs text-muted-foreground">"{r.counter_offer_note}"</p>}
                </div>
                <div className="flex gap-2">
                  <button disabled={busyId === r.id} onClick={() => respondToCounter(r, true)}
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Accept</button>
                  <button disabled={busyId === r.id} onClick={() => respondToCounter(r, false)}
                    className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50">Decline</button>
                </div>
              </div>
            )}

            {openProofId === r.id && hasProof && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex flex-wrap gap-3">
                  {r.check_in_photo_url && <ProofItem url={r.check_in_photo_url} label="Check-in" />}
                  {r.completion_photo_urls?.map((u, i) => <ProofItem key={i} url={u} label={`Work proof ${i + 1}`} />)}
                  {r.check_out_photo_url && <ProofItem url={r.check_out_photo_url} label="Check-out" />}
                </div>
                {r.completion_notes && <p className="mt-2 text-xs text-muted-foreground">"{r.completion_notes}"</p>}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function ProofItem({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      {isVideoUrl(url) ? (
        <video src={url} controls className="h-28 w-28 rounded-xl object-cover border border-border" />
      ) : (
        <img src={url} alt={label} className="h-28 w-28 rounded-xl object-cover border border-border" />
      )}
      <div className="mt-1 text-center text-[10px] text-muted-foreground">{label}</div>
    </a>
  );
}

function HirePanel({ worker, bookings, userId, onClose }: {
  worker: MarketWorker; bookings: HallBooking[]; userId: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [bookingId, setBookingId] = useState(bookings[0]?.id ?? "");
  const booking = bookings.find((b) => b.id === bookingId);
  const requestedServices = ((booking?.details?.requested_services as RequestedService[] | undefined) ?? []);
  const bookingAttachments = (booking?.attachments ?? []) as Attachment[];

  const { data: assignedServices = {} } = useQuery({
    queryKey: ["assigned-worker-services", bookingId],
    queryFn: () => fetchAssignedServices(bookingId),
    enabled: !!bookingId,
  });

  const [serviceKey, setServiceKey] = useState("");
  const selectedService = requestedServices.find((s) => `${s.category}|${s.name}` === serviceKey);
  const [jobRole, setJobRole] = useState<string>(WORKER_CATEGORIES[0] ?? "");
  const [ownerNote, setOwnerNote] = useState("");
  const [selectedAttachmentUrls, setSelectedAttachmentUrls] = useState<Set<string>>(new Set());
  const [acknowledgeDuplicate, setAcknowledgeDuplicate] = useState(false);

  const [form, setForm] = useState({
    event_date: booking?.event_date ?? "", start_time: "", end_time: "",
    quantity: "1", pricing_unit: "per_worker" as PricingUnit, fee_per_unit: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const existingForService = serviceKey ? assignedServices[serviceKey] : undefined;
  const quantity = Math.max(1, Number(form.quantity) || 1);
  const feePerUnit = Number(form.fee_per_unit) || 0;
  const totalFee = form.pricing_unit === "per_worker" ? feePerUnit * quantity : feePerUnit;
  const taskName = selectedService ? `${jobRole} — ${selectedService.name}` : jobRole;
  const customerRequirement = selectedService?.requirement_note ?? "";

  const mutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      if (!jobRole.trim() || !form.event_date) {
        throw new Error("Job role and date are required.");
      }
      if (!feePerUnit || feePerUnit <= 0) {
        throw new Error(`Enter the proposed fee ${PRICING_UNIT_LABEL[form.pricing_unit]}.`);
      }
      if (existingForService && existingForService.length > 0 && !acknowledgeDuplicate) {
        throw new Error("This service already has a worker assigned — tick the box below to add another anyway.");
      }
      const forwardedAttachments = bookingAttachments.filter((a) => selectedAttachmentUrls.has(a.url));
      const { data, error } = await supabase.from("worker_tasks" as never).insert({
        worker_id: worker.id,
        worker_user_id: worker.owner_id,
        assigned_by: userId,
        organization_id: null,
        organization_name: booking?.target_name ?? "Venue booking",
        customer_booking_id: booking?.id ?? null,
        event_name: (booking?.details?.event_name as string) || booking?.target_name || "Event",
        task_name: taskName.trim(),
        service_category: selectedService?.category ?? jobRole,
        service_name: selectedService?.name ?? null,
        customer_requirements: [customerRequirement, ownerNote.trim() ? `Venue note: ${ownerNote.trim()}` : ""].filter(Boolean).join("\n\n") || null,
        attachments: forwardedAttachments,
        venue: booking?.target_name ?? null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        guest_count: Number(booking?.details?.guest_count ?? 0) || null,
        quantity,
        pricing_unit: form.pricing_unit,
        priority: "normal",
        status: "pending",
        proposed_fee: totalFee,
        booking_source: "direct_platform_booking",
      } as never).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Request was blocked — please refresh and try again.");
      notifyUsers([worker.owner_id], "New booking request", `You've been requested for "${taskName.trim()}" — check Jobs to respond.`, "/worker/jobs");
    },
    onSuccess: () => { toast.success("Booking request sent!"); qc.invalidateQueries({ queryKey: ["verified-workers"] }); qc.invalidateQueries({ queryKey: ["assigned-worker-services"] }); onClose(); },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to send request";
      toast.error(msg);
      setFormError(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg my-8 rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Book {worker.full_name}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">They'll need to accept before this is confirmed. Your proposed fee is never shown to the customer.</p>
        <div className="mt-4 space-y-3">
          {bookings.length > 0 ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Which confirmed event is this for?</label>
              <select value={bookingId} onChange={(e) => {
                setBookingId(e.target.value);
                setServiceKey("");
                setSelectedAttachmentUrls(new Set());
                const b = bookings.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, event_date: b?.event_date ?? f.event_date }));
              }} className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none">
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>{(b.details?.event_name as string) || b.target_name} — {b.event_date ? new Date(b.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "no date"} ({b.status})</option>
                ))}
              </select>
              {booking && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {booking.target_name} · {booking.event_date} · {(booking.details?.guest_count as number) ?? "?"} guests
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
              No confirmed bookings yet — a worker can only be hired against a confirmed event booking.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Job role</label>
            <select value={jobRole} onChange={(e) => setJobRole(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none">
              {WORKER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {requestedServices.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Linked to which of the customer's requested services?</label>
              <select value={serviceKey} onChange={(e) => { setServiceKey(e.target.value); setAcknowledgeDuplicate(false); }}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none">
                <option value="">Not linked to a specific requested service</option>
                {requestedServices.map((s) => (
                  <option key={`${s.category}|${s.name}`} value={`${s.category}|${s.name}`}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>
          )}

          {selectedService && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer's requirement</div>
              <p className="mt-1 text-sm">{customerRequirement || "No specific note left by the customer."}</p>
            </div>
          )}

          {existingForService && existingForService.length > 0 && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> Already assigned</div>
              <p className="mt-1">{existingForService.map((e) => `${e.full_name} (${e.status})`).join(", ")}</p>
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={acknowledgeDuplicate} onChange={(e) => setAcknowledgeDuplicate(e.target.checked)} />
                Add another worker for this service anyway
              </label>
            </div>
          )}

          {bookingAttachments.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Reference files to include</label>
              <div className="space-y-1.5">
                {bookingAttachments.map((a) => (
                  <label key={a.url} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                    <input type="checkbox" checked={selectedAttachmentUrls.has(a.url)} onChange={(e) => {
                      setSelectedAttachmentUrls((prev) => { const next = new Set(prev); if (e.target.checked) next.add(a.url); else next.delete(a.url); return next; });
                    }} />
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" /> {a.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <textarea placeholder="Work description / instructions for the worker (optional)" value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} rows={2}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />

          <input type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
            <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Users className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="number" min={1} placeholder="Number of workers" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
            </div>
            <select value={form.pricing_unit} onChange={(e) => setForm((f) => ({ ...f, pricing_unit: e.target.value as PricingUnit }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none">
              {(Object.keys(PRICING_UNIT_LABEL) as PricingUnit[]).map((u) => <option key={u} value={u}>{PRICING_UNIT_LABEL[u]}</option>)}
            </select>
          </div>
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="number" placeholder={`Fee ${PRICING_UNIT_LABEL[form.pricing_unit]} (₹)`} value={form.fee_per_unit} onChange={(e) => setForm((f) => ({ ...f, fee_per_unit: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>
          {feePerUnit > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-accent/40 px-3.5 py-2.5 text-sm font-semibold">
              <span>Total Proposed Worker Fee</span>
              <span>₹{totalFee.toLocaleString("en-IN")}</span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Separate from what the customer is paying you. The worker/agency can accept, counter-offer, or decline.</p>
        </div>
        {formError && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <span className="font-semibold">Could not send:</span> {formError}
          </div>
        )}
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />} Send booking request
        </button>
      </div>
    </div>
  );
}
