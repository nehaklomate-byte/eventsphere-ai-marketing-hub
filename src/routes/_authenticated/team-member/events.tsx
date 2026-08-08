import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, CalendarDays, Lock } from "lucide-react";
import {
  fetchMyMemberships, fetchOrgEvents, createOrgEvent, updateOrgEvent, memberHasPermission, type OrgEvent,
} from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/team-member/events")({
  head: () => ({ meta: [{ title: "Events - EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: TeamMemberEventsPage,
});

const STATUS_BADGE: Record<OrgEvent["status"], string> = {
  draft: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  ongoing: "bg-brand-violet/15 text-brand-violet",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

function TeamMemberEventsPage() {
  const qc = useQueryClient();
  const { data: memberships } = useQuery({ queryKey: ["my-memberships"], queryFn: fetchMyMemberships });
  const membership = memberships?.[0];
  const orgId = membership?.org_id;
  const role = membership?.role ?? null;

  const canCreate = memberHasPermission(role, "create_event");
  const canPublish = memberHasPermission(role, "publish_event");
  const canView = canCreate || memberHasPermission(role, "edit_event") || canPublish;

  const { data: events, isLoading } = useQuery({
    queryKey: ["organization-events", orgId],
    queryFn: () => fetchOrgEvents(orgId!),
    enabled: !!orgId && canView,
  });

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [mode, setMode] = useState<OrgEvent["mode"]>("offline");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canView) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
        <Lock className="h-5 w-5" /> You don't have permission to view Events.
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createOrgEvent(orgId, { title: title.trim(), event_type: eventType.trim() || "General", mode, status: "draft" });
      setTitle(""); setEventType("");
      await qc.invalidateQueries({ queryKey: ["organization-events", orgId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(ev: OrgEvent) {
    if (!canPublish || !orgId) return;
    await updateOrgEvent(ev.id, { status: ev.status === "draft" ? "published" : "draft" });
    await qc.invalidateQueries({ queryKey: ["organization-events", orgId] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canCreate ? "Create and manage events for your organization." : "Events you can view, based on your permissions."}
        </p>
      </div>

      {canCreate && (
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
                placeholder="e.g. Hackathon, Seminar" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
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
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
            <Plus className="h-4 w-4" /> {saving ? "Creating..." : "Create event (draft)"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading events...</p>}
        {!isLoading && (events?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
        {(events ?? []).map((ev) => (
          <div key={ev.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-violet/10 text-brand-violet"><CalendarDays className="h-4 w-4" /></div>
              <div>
                <p className="font-medium">{ev.title}</p>
                <p className="text-sm text-muted-foreground">{ev.event_type} · {ev.mode}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[ev.status]}`}>{ev.status}</span>
              {canPublish && (ev.status === "draft" || ev.status === "published") && (
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
