import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { fetchMyWorker, WEEKDAYS } from "@/lib/worker";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/worker/availability")({
  component: AvailabilityPage,
});

function AvailabilityPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: worker } = useQuery({
    queryKey: ["me-worker", user?.id], queryFn: () => fetchMyWorker(user!.id), enabled: !!user?.id,
  });

  const [days, setDays] = useState<string[]>([]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [travel, setTravel] = useState(false);
  const [maxKm, setMaxKm] = useState<number | "">("");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [newBlocked, setNewBlocked] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!worker) return;
    setDays(Array.isArray(worker.available_days) ? worker.available_days as string[] : []);
    setStart(worker.working_hours_start ?? "09:00");
    setEnd(worker.working_hours_end ?? "18:00");
    setTravel(!!worker.willing_to_travel);
    setMaxKm(worker.max_travel_km ?? "");
    setBlocked(Array.isArray((worker as { blocked_dates?: unknown }).blocked_dates) ? (worker as unknown as { blocked_dates: string[] }).blocked_dates : []);
    setVisible(!!worker.marketplace_visible);
  }, [worker]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workers")
        .update({
          available_days: days as never,
          working_hours_start: start,
          working_hours_end: end,
          willing_to_travel: travel,
          max_travel_km: maxKm === "" ? null : Number(maxKm),
          blocked_dates: blocked as never,
          marketplace_visible: visible,
        } as never).eq("owner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Availability updated"); qc.invalidateQueries({ queryKey: ["me-worker", user?.id] }); },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set the days, hours and travel radius you're available for work.</p>
      </div>

      <Section title="Working days">
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const active = days.includes(d);
            return (
              <button key={d} type="button"
                onClick={() => setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
                className={`rounded-xl px-4 py-2 text-sm font-semibold border ${active ? "bg-brand-violet text-white border-brand-violet" : "border-border hover:bg-accent"}`}>
                {d}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Working hours">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Field label="Start"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" /></Field>
          <Field label="End"><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" /></Field>
        </div>
      </Section>

      <Section title="Travel">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={travel} onChange={(e) => setTravel(e.target.checked)} className="h-4 w-4 rounded" />
          I'm willing to travel for jobs
        </label>
        {travel && (
          <div className="mt-3 max-w-xs">
            <Field label="Maximum travel distance (km)">
              <input type="number" min={1} value={maxKm} onChange={(e) => setMaxKm(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Blocked dates">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Add unavailable date">
            <input type="date" value={newBlocked} onChange={(e) => setNewBlocked(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <button type="button"
            onClick={() => { if (newBlocked && !blocked.includes(newBlocked)) { setBlocked([...blocked, newBlocked].sort()); setNewBlocked(""); } }}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-accent">Add</button>
        </div>
        {blocked.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {blocked.map((d) => (
              <span key={d} className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 text-rose-700 px-3 py-1 text-xs font-medium">
                {d}
                <button type="button" onClick={() => setBlocked(blocked.filter((x) => x !== d))} className="text-rose-800 hover:text-rose-900">×</button>
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Marketplace visibility">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
          <span>
            <span className="font-semibold">Show my profile on the marketplace</span>
            <span className="block text-xs text-muted-foreground">Only enabled after your profile is verified.</span>
          </span>
        </label>
      </Section>

      <div className="flex justify-end">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold text-white">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}
