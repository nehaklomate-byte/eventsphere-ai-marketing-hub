import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/events")({
  component: EventsPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Event name required").max(120),
  event_type: z.string().max(60).optional().or(z.literal("")),
  event_date: z.string().optional().or(z.literal("")),
  venue: z.string().max(200).optional().or(z.literal("")),
  guests: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  budget: z.coerce.number().nonnegative().optional().or(z.literal("")),
  status: z.enum(["planning","upcoming","completed","cancelled"]).default("planning"),
});

function EventsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"upcoming"|"past"|"cancelled">("upcoming");

  const { data, isLoading } = useQuery({
    queryKey: ["c-events", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("customer_events").select("*").eq("user_id", user!.id).order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const now = new Date().toISOString().slice(0, 10);
  const filtered = (data ?? []).filter((e) => {
    if (tab === "cancelled") return e.status === "cancelled";
    const upcoming = !e.event_date || e.event_date >= now;
    if (tab === "upcoming") return e.status !== "cancelled" && upcoming;
    return e.status !== "cancelled" && !upcoming;
  });

  return (
    <PageShell title="My Events" subtitle="Plan, track and manage every event you're hosting."
      action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New event</button>}>

      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {(["upcoming","past","cancelled"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-brand-violet text-white" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>

      {isLoading ? <LoadingRows /> : filtered.length === 0 ? (
        <EmptyState title="No events here yet" description="Create your first event to start tracking bookings, guests and budget." icon={CalendarDays} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-brand-violet">{e.event_type ?? "Event"}</div>
                <span className="rounded-full bg-brand-violet/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-brand-violet">{e.status}</span>
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold">{e.name}</h3>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><dt>Date</dt><dd>{e.event_date ?? "TBD"}</dd></div>
                <div className="flex justify-between"><dt>Venue</dt><dd>{e.venue ?? "TBD"}</dd></div>
                <div className="flex justify-between"><dt>Guests</dt><dd>{e.guests ?? "—"}</dd></div>
                <div className="flex justify-between"><dt>Budget</dt><dd>{e.budget ? `₹${Number(e.budget).toLocaleString("en-IN")}` : "—"}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} title="Create event">
          <NewEventForm
            onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["c-events"] }); qc.invalidateQueries({ queryKey: ["customer-dashboard"] }); }}
            userId={user!.id}
          />
        </Modal>
      )}
    </PageShell>
  );
}

function NewEventForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", event_type: "", event_date: "", venue: "", guests: "", budget: "", status: "planning" as const });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {}; parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      return setErrors(fe);
    }
    setBusy(true);
    const payload = {
      user_id: userId, name: form.name, event_type: form.event_type || null,
      event_date: form.event_date || null, venue: form.venue || null,
      guests: form.guests ? Number(form.guests) : null,
      budget: form.budget ? Number(form.budget) : null, status: form.status,
    };
    const { error } = await supabase.from("customer_events").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Event created"); onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input label="Event name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} err={errors.name} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Type" placeholder="Wedding, Corporate…" value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} />
        <Input label="Date" type="date" value={form.event_date} onChange={(v) => setForm({ ...form, event_date: v })} />
      </div>
      <Input label="Venue" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Guests" type="number" value={form.guests} onChange={(v) => setForm({ ...form, guests: v })} />
        <Input label="Budget (₹)" type="number" value={form.budget} onChange={(v) => setForm({ ...form, budget: v })} />
      </div>
      <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold text-white">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create event
      </button>
    </form>
  );
}

function Input({ label, value, onChange, type = "text", err, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; err?: string; placeholder?: string; }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full rounded-xl border bg-background px-3 py-2 text-sm ${err ? "border-rose-500" : "border-input"}`} />
      {err && <span className="mt-1 block text-[11px] text-rose-500">{err}</span>}
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
