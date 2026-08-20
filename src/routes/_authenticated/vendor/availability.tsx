import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, CalendarX } from "lucide-react";
import { fetchMyVendor } from "@/lib/vendor";

export const Route = createFileRoute("/_authenticated/vendor/availability")({
  head: () => ({ meta: [{ title: "Availability — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: AvailabilityPage,
});

function AvailabilityPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: vendor, isLoading } = useQuery({ queryKey: ["me-vendor", user?.id], queryFn: () => fetchMyVendor(user!.id), enabled: !!user?.id });
  const v = vendor as (typeof vendor & { blocked_dates?: string[]; willing_to_travel?: boolean; max_travel_km?: number | null; working_hours_start?: string | null; working_hours_end?: string | null }) | null | undefined;

  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [travel, setTravel] = useState(false);
  const [maxKm, setMaxKm] = useState("");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [newBlock, setNewBlock] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!v) return;
    setStart(v.working_hours_start ?? "09:00");
    setEnd(v.working_hours_end ?? "18:00");
    setTravel(!!v.willing_to_travel);
    setMaxKm(v.max_travel_km != null ? String(v.max_travel_km) : "");
    setBlocked(Array.isArray(v.blocked_dates) ? v.blocked_dates : []);
  }, [v]);

  const save = useMutation({
    mutationFn: async () => {
      if (!v?.id) throw new Error("Vendor profile not found.");
      const { data, error } = await supabase.from("vendors").update({
        working_hours_start: start,
        working_hours_end: end,
        willing_to_travel: travel,
        max_travel_km: maxKm ? Number(maxKm) : null,
        blocked_dates: blocked,
      } as never).eq("id", v.id).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Update was blocked — please refresh and try again.");
    },
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); qc.invalidateQueries({ queryKey: ["me-vendor", user?.id] }); },
  });

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell clients when you can take bookings and how far you'll travel.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold">Working hours</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Start time</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">End time</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold">Travel</h2>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={travel} onChange={(e) => setTravel(e.target.checked)} className="h-4 w-4 rounded border-input" />
          I'm willing to travel outside my city for events
        </label>
        {travel && (
          <label className="text-sm block max-w-xs">
            <span className="mb-1 block font-medium">Maximum travel distance (km)</span>
            <input type="number" min={0} value={maxKm} onChange={(e) => setMaxKm(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. 150" />
          </label>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold">Blocked dates</h2>
        <p className="text-xs text-muted-foreground">Dates you're unavailable. Clients won't be able to request these days.</p>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={newBlock} onChange={(e) => setNewBlock(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <button type="button" onClick={() => { if (newBlock && !blocked.includes(newBlock)) setBlocked([...blocked, newBlock].sort()); setNewBlock(""); }}
            className="rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent">Block date</button>
        </div>
        {blocked.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarX className="h-4 w-4" /> No blocked dates yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {blocked.map((d) => (
              <span key={d} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
                {new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                <button onClick={() => setBlocked(blocked.filter((x) => x !== d))} className="text-muted-foreground hover:text-destructive" aria-label={`Unblock ${d}`}>×</button>
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save availability
        </button>
        {saved && <span className="text-xs font-medium text-emerald-600">Saved.</span>}
        {save.isError && <span className="text-xs font-medium text-destructive">{(save.error as Error).message}</span>}
      </div>
    </div>
  );
}
