import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Store, MapPin, Star, Search, Wallet, Send, X, Loader2, Briefcase, IndianRupee, CheckCircle2, Clock3, ImageIcon, FileText, Sparkles, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { fetchMyHalls, fetchHallBookings, type HallBooking } from "@/lib/venue";
import { isVideoUrl } from "@/lib/worker";
import { VENDOR_CATEGORIES } from "@/lib/vendor";
import { payForWorkerTask } from "@/lib/razorpay";
import { notifyUsers } from "@/lib/push";

export const Route = createFileRoute("/_authenticated/venue/hire-vendors")({
  head: () => ({ meta: [{ title: "Hire Vendors — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: HireVendorsPage,
});

type MarketVendor = {
  id: string; owner_id: string; business_name: string; logo_url: string | null;
  category: string | null; city: string | null; state: string | null;
  years_experience: number | null; rating: number; review_count: number;
  price_catalogue_url: string | null;
};

async function fetchVerifiedVendors(category: string): Promise<MarketVendor[]> {
  let q = supabase.from("vendors")
    .select("id,owner_id,business_name,logo_url,category,city,state,years_experience,rating,review_count,price_catalogue_url")
    .eq("verified", true).eq("status", "published").is("deleted_at", null)
    .order("rating", { ascending: false });
  if (category) q = q.eq("category", category);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as MarketVendor[]) ?? [];
}

type MyRequest = {
  id: string; task_name: string; event_name: string; event_date: string;
  status: string; payment_status: string; payment_amount: number | null;
  check_in_photo_url: string | null; check_out_photo_url: string | null; completion_photo_urls: string[] | null;
  completion_notes: string | null;
  vendor: { business_name: string } | null;
};

// A single service the customer asked for on one of this venue's
// bookings (e.g. "Veg Basic" under category "Caterer"), paired with the
// requirement note they wrote and — once the owner has priced the
// booking — what they were budgeted for it. Lets the owner both find a
// matching vendor quickly and hand that vendor the customer's actual
// requirement instead of retyping it.
type RequestedItem = {
  bookingId: string; bookingLabel: string; category: string; name: string;
  requirementNote: string | null; budget: number | null;
};

function extractRequestedItems(bookings: HallBooking[]): RequestedItem[] {
  const items: RequestedItem[] = [];
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const requested = (b.details?.requested_services as { category: string; name: string; requirement_note?: string | null }[] | undefined) ?? [];
    const priceLines = (b.details?.price_breakdown as { label: string; amount: number }[] | undefined) ?? [];
    for (const r of requested) {
      const line = priceLines.find((l) => l.label === `${r.name} (${r.category})`);
      items.push({
        bookingId: b.id,
        bookingLabel: `${b.target_name}${b.event_date ? ` — ${new Date(b.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`,
        category: r.category,
        name: r.name,
        requirementNote: r.requirement_note ?? null,
        budget: line ? Number(line.amount) : null,
      });
    }
  }
  return items;
}

// Loose category match — the customer's category is whatever text the
// venue owner typed into their own service list (e.g. "Caterer"), which
// won't always exactly equal a vendor's marketplace category (e.g.
// "Catering"). Matching on a normalised substring catches most of these
// without needing the two lists to be kept in sync.
function categoriesLooselyMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/s$/, "");
  const na = norm(a), nb = norm(b);
  return na.includes(nb) || nb.includes(na);
}

async function fetchMyRequests(userId: string): Promise<MyRequest[]> {
  const { data, error } = await supabase.from("vendor_tasks" as never)
    .select("id,task_name,event_name,event_date,status,payment_status,payment_amount,check_in_photo_url,check_out_photo_url,completion_photo_urls,completion_notes,vendor:vendors(business_name)")
    .eq("assigned_by" as never, userId as never)
    .order("event_date" as never, { ascending: false }).limit(30);
  if (error) throw error;
  return (data as unknown as MyRequest[]) ?? [];
}

function HireVendorsPage() {
  const { user } = useSession();
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [hireTarget, setHireTarget] = useState<MarketVendor | null>(null);
  const [matchedRequestKey, setMatchedRequestKey] = useState("");

  const { data: halls = [] } = useQuery({ queryKey: ["my-halls"], queryFn: fetchMyHalls, enabled: !!user?.id });
  const { data: bookings = [] } = useQuery({
    queryKey: ["my-hall-bookings-for-hire", halls.map((h) => h.id).join(",")],
    queryFn: () => fetchHallBookings(halls.map((h) => h.id)),
    enabled: halls.length > 0,
  });
  const { data: vendors = [], isLoading } = useQuery({ queryKey: ["verified-vendors", category], queryFn: () => fetchVerifiedVendors(category) });

  const requestedItems = extractRequestedItems(bookings);
  const matchedRequest = requestedItems.find((r) => `${r.bookingId}::${r.name}` === matchedRequestKey) ?? null;

  const filtered = vendors.filter((v) => {
    if (q && !(v.business_name.toLowerCase().includes(q.toLowerCase()) || (v.city ?? "").toLowerCase().includes(q.toLowerCase()))) return false;
    if (matchedRequest && v.category && !categoriesLooselyMatch(v.category, matchedRequest.category)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Hire Vendors</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse verified vendors and send them a direct booking request for your venue's events — they need to accept before it's confirmed.</p>
      </div>

      {requestedItems.length > 0 && (
        <div className="rounded-xl border border-brand-violet/25 bg-brand-violet/5 px-4 py-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-brand-violet mb-1.5"><Sparkles className="h-3.5 w-3.5" /> Find a vendor for a customer's request</label>
          <select value={matchedRequestKey} onChange={(e) => setMatchedRequestKey(e.target.value)}
            className="w-full rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none">
            <option value="">Show all vendors</option>
            {requestedItems.map((r) => (
              <option key={`${r.bookingId}::${r.name}`} value={`${r.bookingId}::${r.name}`}>
                {r.name} ({r.category}) — {r.bookingLabel}{r.budget != null ? ` · budgeted ₹${r.budget.toLocaleString("en-IN")}` : ""}
              </option>
            ))}
          </select>
          {matchedRequest && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">Showing vendors whose category matches "{matchedRequest.category}". When you send a request, this service's requirement note {matchedRequest.budget != null ? "and budgeted amount " : ""}will be filled in for you.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business or city…"
            className="w-full rounded-full border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-violet" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none">
          <option value="">All categories</option>
          {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 rounded-2xl bg-card animate-pulse border border-border" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No verified vendors match this search yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <article key={v.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft flex flex-col">
              <div className="flex items-center gap-3">
                {v.logo_url ? (
                  <img src={v.logo_url} alt={v.business_name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-muted-foreground"><Store className="h-5 w-5" /></div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{v.business_name}</h3>
                  <div className="text-xs text-muted-foreground truncate">{v.category ?? "Vendor"}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {v.city && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {[v.city, v.state].filter(Boolean).join(", ")}</div>}
                {v.years_experience != null && <div>{v.years_experience}+ yrs experience</div>}
                {v.review_count > 0 && <div className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange" /> {v.rating.toFixed(1)} ({v.review_count})</div>}
                {v.price_catalogue_url && (
                  <a href={v.price_catalogue_url} target="_blank" rel="noreferrer" className="pt-1 inline-flex items-center gap-1.5 text-brand-violet font-medium">
                    <FileText className="h-3.5 w-3.5" /> Price catalogue
                  </a>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Link to="/vendor/$id" params={{ id: v.id }} target="_blank"
                  className="flex-1 inline-flex items-center justify-center rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent">
                  View full profile
                </Link>
                <button onClick={() => setHireTarget(v)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3.5 py-2 text-xs font-semibold text-white">
                  <Send className="h-3.5 w-3.5" /> Send request
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {hireTarget && user?.id && (
        <HirePanel vendor={hireTarget} bookings={bookings} userId={user.id} matchedRequest={matchedRequest} onClose={() => setHireTarget(null)} />
      )}

      {user?.id && <MyRequests userId={user.id} />}
    </div>
  );
}

function MyRequests({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({ queryKey: ["my-vendor-requests", userId], queryFn: () => fetchMyRequests(userId), enabled: !!userId });
  const [payingId, setPayingId] = useState<string | null>(null);
  const [openProofId, setOpenProofId] = useState<string | null>(null);

  async function handlePay(r: MyRequest) {
    setPayingId(r.id);
    try {
      await payForWorkerTask({ workerTaskId: r.id, entityType: "vendor" });
      toast.success("Payment successful!");
      qc.invalidateQueries({ queryKey: ["my-vendor-requests", userId] });
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
        {requests.map((r) => {
          const hasProof = r.check_in_photo_url || r.check_out_photo_url || (r.completion_photo_urls?.length ?? 0) > 0;
          return (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{r.task_name} <span className="text-muted-foreground font-normal">— {r.vendor?.business_name ?? "Vendor"}</span></div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(r.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusTone[r.status] ?? "bg-muted text-muted-foreground"}`}>{r.status.replace("_", " ")}</span>
                  {r.payment_amount != null && <span className="font-semibold text-foreground">₹{r.payment_amount.toLocaleString("en-IN")}</span>}
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
                    <Link to="/receipt/$type/$id" params={{ type: "vendor", id: r.id }} target="_blank"
                      className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">Receipt</Link>
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
            </div>

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

function HirePanel({ vendor, bookings, userId, matchedRequest, onClose }: {
  vendor: MarketVendor; bookings: HallBooking[]; userId: string; matchedRequest: RequestedItem | null; onClose: () => void;
}) {
  const qc = useQueryClient();
  const activeBookings = bookings.filter((b) => b.status !== "cancelled");
  const initialBookingId = matchedRequest?.bookingId ?? activeBookings[0]?.id ?? "";
  const initialBooking = activeBookings.find((b) => b.id === initialBookingId);
  const [form, setForm] = useState({
    event_name: "", task_name: matchedRequest?.name ?? "",
    booking_id: initialBookingId, event_date: initialBooking?.event_date ?? "",
    start_time: "", end_time: "", pay_amount: "", advance_amount: "",
  });
  const [requirementNote, setRequirementNote] = useState(matchedRequest?.requirementNote ?? "");
  const [budgetHint, setBudgetHint] = useState<number | null>(matchedRequest?.budget ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  // Picking a different booking from the dropdown (when the owner didn't
  // arrive here via "Find a vendor for a customer's request") — see if
  // that booking asked for something in this vendor's category, and if
  // so offer to fill the task name + requirement note from it instead of
  // making the owner retype what the customer already wrote.
  function onBookingChange(bookingId: string) {
    const b = activeBookings.find((x) => x.id === bookingId);
    const requested = (b?.details?.requested_services as { category: string; name: string; requirement_note?: string | null }[] | undefined) ?? [];
    const priceLines = (b?.details?.price_breakdown as { label: string; amount: number }[] | undefined) ?? [];
    const match = vendor.category ? requested.find((r) => categoriesLooselyMatch(r.category, vendor.category!)) : undefined;
    setForm((f) => ({ ...f, booking_id: bookingId, event_date: b?.event_date ?? f.event_date, task_name: match ? match.name : f.task_name }));
    if (match) {
      setRequirementNote(match.requirement_note ?? "");
      const line = priceLines.find((l) => l.label === `${match.name} (${match.category})`);
      setBudgetHint(line ? Number(line.amount) : null);
    } else {
      setBudgetHint(null);
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      if (!form.task_name.trim() || !form.event_date) {
        throw new Error("Task and date are required.");
      }
      const booking = activeBookings.find((b) => b.id === form.booking_id);
      const { data, error } = await supabase.from("vendor_tasks" as never).insert({
        vendor_id: vendor.id,
        vendor_user_id: vendor.owner_id,
        assigned_by: userId,
        organization_id: null,
        organization_name: booking?.target_name ?? "Venue booking",
        customer_booking_id: booking?.id ?? null,
        event_name: (form.event_name || booking?.target_name || "Event").trim(),
        task_name: form.task_name.trim(),
        description: requirementNote.trim() || null,
        venue: booking?.target_name ?? null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        priority: "normal",
        status: "pending",
        payment_amount: form.pay_amount ? Number(form.pay_amount) : null,
        advance_amount: form.advance_amount ? Number(form.advance_amount) : null,
        booking_source: "direct_platform_booking",
      } as never).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Request was blocked — please refresh and try again.");
      notifyUsers([vendor.owner_id], "New booking request", `You've been requested for "${form.task_name.trim()}" — check Jobs to accept.`, "/vendor/jobs");
    },
    onSuccess: () => { toast.success("Booking request sent!"); qc.invalidateQueries({ queryKey: ["verified-vendors"] }); onClose(); },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to send request";
      toast.error(msg);
      setFormError(msg); // also shown inline below — a toast alone can be
      // missed (auto-dismisses, easy to not notice on mobile), which is
      // what made a real failure here look like "the button does nothing".
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Book {vendor.business_name}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">They'll need to accept before this is confirmed.</p>
        <div className="mt-4 space-y-3">
          {activeBookings.length > 0 ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Which event/booking is this for?</label>
              <select value={form.booking_id} onChange={(e) => onBookingChange(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none">
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>{b.target_name} — {b.event_date ? new Date(b.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "no date"} ({b.status})</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">This links the hire to that specific event, so it shows up under it later.</p>
            </div>
          ) : (
            <input placeholder="Event name" value={form.event_name} onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          )}
          <input placeholder="Task (what should they do?)" value={form.task_name} onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          <div>
            <textarea rows={2} placeholder="Customer's requirement for this (optional — shown to the vendor)"
              value={requirementNote} onChange={(e) => setRequirementNote(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
            {requirementNote && <p className="mt-1 text-[11px] text-muted-foreground">This will show on the vendor's job request so they know exactly what the customer asked for.</p>}
          </div>
          <input type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
            <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>
          {budgetHint != null && (
            <p className="flex items-center gap-1.5 rounded-lg bg-accent/40 px-3 py-2 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 text-brand-violet" /> You quoted the customer ₹{budgetHint.toLocaleString("en-IN")} for this service — enter what you're paying the vendor below.
            </p>
          )}
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="number" placeholder="Pay amount (₹, optional)" value={form.pay_amount} onChange={(e) => setForm((f) => ({ ...f, pay_amount: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>
          <div className="relative">
            <Wallet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="number" placeholder="Advance amount (₹, optional — lets them pay this part first)" value={form.advance_amount} onChange={(e) => setForm((f) => ({ ...f, advance_amount: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          </div>
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
