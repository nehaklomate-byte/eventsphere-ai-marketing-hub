import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Loader2, Send, Users } from "lucide-react";
import { sendBroadcast, fetchRecentBroadcasts, type BroadcastAudience } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  head: () => ({ meta: [{ title: "Broadcast Center — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: BroadcastPage,
});

const AUDIENCES: { value: BroadcastAudience; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "customer", label: "Customers" },
  { value: "hall_owner", label: "Venue owners" },
  { value: "vendor", label: "Vendors" },
  { value: "worker", label: "Workers" },
  { value: "organization", label: "Organizations" },
];

const TYPE_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  error: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

function BroadcastPage() {
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const history = useQuery({ queryKey: ["admin-broadcast-history"], queryFn: fetchRecentBroadcasts });

  async function send() {
    if (!title.trim()) { toast.error("Title is required."); return; }
    setSending(true);
    try {
      const count = await sendBroadcast(audience, title.trim(), body.trim(), type);
      toast.success(count > 0 ? `Sent to ${count} user${count === 1 ? "" : "s"}` : "No matching users found for that audience.");
      setTitle(""); setBody(""); setConfirming(false);
      history.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <Bell className="h-7 w-7 text-brand-violet" /> Broadcast Center
        </h1>
        <p className="mt-1 text-muted-foreground">Send an announcement to every user on a role, or the whole platform. It lands in their notifications.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-2xl">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Audience</label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button key={a.value} onClick={() => setAudience(a.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${audience === a.value ? "bg-brand-violet text-white" : "border border-border hover:bg-accent"}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Type</label>
          <div className="flex gap-2">
            {(["info", "success", "warning", "error"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${type === t ? TYPE_STYLE[t] + " ring-2 ring-offset-1 ring-brand-violet/40" : TYPE_STYLE[t]}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheduled maintenance tonight"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Message</span>
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do they need to know?"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
        </label>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} disabled={!title.trim()}
            className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            <Send className="h-4 w-4" /> Review & send
          </button>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Send to: {AUDIENCES.find((a) => a.value === audience)?.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">This can't be recalled once sent. Double-check the message above.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirming(false)} className="rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent">Cancel</button>
              <button onClick={send} disabled={sending} className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold disabled:opacity-70">
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm & send
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent broadcasts</h2>
        {history.isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…</div>
        ) : (history.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">No broadcasts sent yet.</div>
        ) : (
          <div className="space-y-2">
            {history.data!.map((b, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${TYPE_STYLE[b.type] ?? TYPE_STYLE.info}`}>{b.type}</span>
                  <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString("en-IN")} · {b.recipient_count} recipients</span>
                </div>
                <div className="mt-1.5 text-sm font-semibold">{b.title}</div>
                {b.body && <div className="text-xs text-muted-foreground">{b.body}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
