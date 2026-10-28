import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Loader2, Send, Users, Clock, CheckCircle2, Search, UserRound, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { createBroadcastMessage, fetchAllBroadcastMessages, searchBroadcastRecipients, sendDirectMessage, type BroadcastAudience, type BroadcastMessage, type BroadcastRecipient } from "@/lib/admin";

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

function isExpired(m: BroadcastMessage) { return !!m.deadline && new Date(m.deadline).getTime() < Date.now(); }

// datetime-local gives "2026-08-20T18:30" (local time, no seconds/zone) — turn that into a real ISO instant for storage.
function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function BroadcastPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // "One specific user" — search a venue / business / person and message only them.
  const [oneUser, setOneUser] = useState(false);
  const [recipient, setRecipient] = useState<BroadcastRecipient | null>(null);
  const [search, setSearch] = useState("");
  const results = useQuery({
    queryKey: ["admin-broadcast-recipients", search.trim()],
    queryFn: () => searchBroadcastRecipients(search),
    enabled: oneUser && !recipient && search.trim().length >= 2,
  });

  const history = useQuery({ queryKey: ["admin-broadcast-history"], queryFn: fetchAllBroadcastMessages });

  async function send() {
    if (!title.trim()) { toast.error("Title is required."); return; }
    if (oneUser && !recipient) { toast.error("Pick who to send it to."); return; }
    setSending(true);
    try {
      if (oneUser && recipient) {
        await sendDirectMessage({ userId: recipient.user_id, label: recipient.label, title: title.trim(), body: body.trim(), type });
        toast.success(`Sent to ${recipient.label}`);
        setTitle(""); setBody(""); setConfirming(false);
        return;
      }
      await createBroadcastMessage({
        title: title.trim(), body: body.trim(), type, audience,
        deadline: localToIso(deadlineLocal), adminUserId: user!.id,
      });
      toast.success("Broadcast sent");
      setTitle(""); setBody(""); setDeadlineLocal(""); setConfirming(false);
      qc.invalidateQueries({ queryKey: ["admin-broadcast-history"] });
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
        <p className="mt-1 text-muted-foreground">Send an announcement to every user on a role, or the whole platform. Each user sees it once, as a popup, the first time they open the app after it's sent.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-2xl">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Audience</label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button key={a.value} onClick={() => { setAudience(a.value); setOneUser(false); }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${!oneUser && audience === a.value ? "bg-brand-violet text-white" : "border border-border hover:bg-accent"}`}>
                {a.label}
              </button>
            ))}
            <button onClick={() => setOneUser(true)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${oneUser ? "bg-brand-violet text-white" : "border border-border hover:bg-accent"}`}>
              <UserRound className="h-3.5 w-3.5" /> One specific user
            </button>
          </div>
        </div>

        {oneUser && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Send to</label>
            {recipient ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-violet/40 bg-brand-violet/5 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{recipient.label}</div>
                  <div className="truncate text-xs text-muted-foreground capitalize">{recipient.sub}</div>
                </div>
                <button onClick={() => { setRecipient(null); setSearch(""); }} className="rounded-full p-1.5 hover:bg-accent" title="Change"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search venue, business, person name or email — e.g. Vishwaraj Lawns"
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-brand-violet" />
                </div>
                {search.trim().length >= 2 && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border">
                    {results.isLoading ? (
                      <div className="flex items-center gap-2 px-3.5 py-3 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…</div>
                    ) : (results.data ?? []).length === 0 ? (
                      <div className="px-3.5 py-3 text-xs text-muted-foreground">No one found for "{search.trim()}".</div>
                    ) : (
                      (results.data ?? []).map((r) => (
                        <button key={r.user_id} onClick={() => setRecipient(r)} className="block w-full border-b border-border px-3.5 py-2.5 text-left last:border-0 hover:bg-accent">
                          <div className="text-sm font-medium">{r.label}</div>
                          <div className="text-xs text-muted-foreground capitalize">{r.sub}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">Only this person gets it — in their notifications (web and app) and as a phone/browser notification.</p>
          </div>
        )}

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

        {!oneUser && <label className="block max-w-xs">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Deadline (optional)</span>
          <input type="datetime-local" value={deadlineLocal} onChange={(e) => setDeadlineLocal(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet" />
          <span className="mt-1 block text-[11px] text-muted-foreground">After this time, the popup stops showing to anyone who hasn't seen it yet. Leave blank for no expiry.</span>
        </label>}

        {!confirming ? (
          <button onClick={() => setConfirming(true)} disabled={!title.trim() || (oneUser && !recipient)}
            className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
            <Send className="h-4 w-4" /> Review & send
          </button>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Send to: {oneUser ? recipient?.label ?? "—" : AUDIENCES.find((a) => a.value === audience)?.label}</p>
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
        <h2 className="mb-3 text-lg font-semibold">Previous messages</h2>
        {history.isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…</div>
        ) : (history.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">No broadcasts sent yet.</div>
        ) : (
          <div className="space-y-2">
            {history.data!.map((b) => {
              const expired = isExpired(b);
              return (
                <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${TYPE_STYLE[b.type] ?? TYPE_STYLE.info}`}>{b.type}</span>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-muted-foreground capitalize">{AUDIENCES.find((a) => a.value === b.audience)?.label ?? b.audience}</span>
                      {expired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"><Clock className="h-3 w-3" /> Expired</span>
                      ) : b.deadline ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Active</span>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString("en-IN")} · by {b.created_by_name} · {b.read_count} seen</span>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold">{b.title}</div>
                  {b.body && <div className="text-xs text-muted-foreground">{b.body}</div>}
                  {b.deadline && <div className="mt-1 text-[11px] text-muted-foreground">Deadline: {new Date(b.deadline).toLocaleString("en-IN")}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
