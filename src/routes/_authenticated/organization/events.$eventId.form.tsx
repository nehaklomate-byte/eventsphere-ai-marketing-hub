import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, CalendarDays } from "lucide-react";
import {
  fetchMyOrganization, fetchOrgEvents, ensureEventForm, updateEventForm,
  fetchFormFields, createFormField, updateFormField, deleteFormField, reorderFormFields,
  FIELD_TYPES,
} from "@/lib/organization";
import type { FieldType, EventFormField } from "@/lib/organization";
export const Route = createFileRoute("/_authenticated/organization/events/$eventId/form")({
s
  head: () => ({ meta: [{ title: "Events — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: OrgEventsPage,
});

const STATUS_BADGE: Record<OrgEvent["status"], string> = {
  draft: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  ongoing: "bg-brand-violet/15 text-brand-violet",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

function OrgEventsPage() {
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["organization-mine"], queryFn: fetchMyOrganization });
  const { data: events, isLoading } = useQuery({
    queryKey: ["organization-events", org?.id],
    queryFn: () => fetchOrgEvents(org!.id),
    enabled: !!org?.id,
  });

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [mode, setMode] = useState<OrgEvent["mode"]>("offline");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!org?.id || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createOrgEvent(org.id, {
        title: title.trim(),
        event_type: eventType.trim() || "General",
        mode,
        start_at: startAt || null,
        end_at: endAt || null,
        status: "draft",
      });
      setTitle(""); setEventType(""); setStartAt(""); setEndAt("");
      await qc.invalidateQueries({ queryKey: ["organization-events", org.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(ev: OrgEvent) {
    await updateOrgEvent(ev.id, { status: ev.status === "draft" ? "published" : "draft" });
    if (org?.id) await qc.invalidateQueries({ queryKey: ["organization-events", org.id] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create hackathons, fests, seminars, competitions or any event type — fully custom. Build each event's
          registration form from the "Registration form" link on its card.
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Event title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="e.g. TechFest 2026" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Event type</label>
            <input value={eventType} onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g. Hackathon, Seminar, Fest" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as OrgEvent["mode"])}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm">
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Start</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">End</label>
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={saving || !org?.id}
          className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {saving ? "Creating…" : "Create event (draft)"}
        </button>
      </form>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading events…</p>}
        {!isLoading && (events?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No events yet — create your first one above.</p>}
        {(events ?? []).map((ev) => (
          <div key={ev.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-violet/10 text-brand-violet"><CalendarDays className="h-4 w-4" /></div>
              <div>
                <p className="font-medium">{ev.title}</p>
                <p className="text-sm text-muted-foreground">{ev.event_type} · {ev.mode}{ev.start_at ? ` · ${new Date(ev.start_at).toLocaleDateString()}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[ev.status]}`}>{ev.status}</span>
              <Link to={`/organization/events/${ev.id}/form`} className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                Registration form
              </Link>
              {(ev.status === "draft" || ev.status === "published") && (
                <button onClick={() => handlePublish(ev)} className="rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                  {ev.status === "draft" ? "Publish" : "Unpublish"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
