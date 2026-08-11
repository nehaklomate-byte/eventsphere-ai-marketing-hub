import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/notifications")({ component: NotificationsPage });

type Row = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; kind?: string; source: "customer" | "platform" };

function tableFor(source: Row["source"]) {
  return source === "platform" ? "platform_notifications" : "customer_notifications";
}

function NotificationsPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["c-notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("customer_notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("platform_notifications" as never).select("*").eq("user_id" as never, user!.id as never).order("created_at" as never, { ascending: false }).limit(100),
      ]);
      const customer = (c ?? []).map((n) => ({ ...n, source: "customer" as const }));
      const platform = ((p ?? []) as unknown as Row[]).map((n) => ({ ...n, kind: "account", source: "platform" as const }));
      return [...customer, ...platform].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Row[];
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel("cn-page-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["c-notifications"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["c-notifications"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  async function markAll() {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("customer_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null),
      supabase.from("platform_notifications" as never).update({ read_at: new Date().toISOString() } as never).eq("user_id" as never, user!.id as never).is("read_at" as never, null as never),
    ]);
    if (e1 || e2) return toast.error((e1 ?? e2)!.message);
    qc.invalidateQueries({ queryKey: ["c-notifications"] });
  }
  async function markOne(n: Row) {
    await supabase.from(tableFor(n.source) as never).update({ read_at: new Date().toISOString() } as never).eq("id" as never, n.id as never);
    qc.invalidateQueries({ queryKey: ["c-notifications"] });
  }

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <PageShell title="Notifications" subtitle={unread ? `${unread} unread` : "You're all caught up."}
      action={unread > 0 ? (<button onClick={markAll} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent"><Check className="h-3.5 w-3.5" /> Mark all read</button>) : null}>
      {isLoading ? <LoadingRows /> : (data?.length ?? 0) === 0 ? (
        <EmptyState title="No notifications yet" description="We'll ping you here about booking updates, payments, account status and offers." icon={Bell} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {data!.map((n) => (
            <li key={`${n.source}-${n.id}`} className={`flex items-start gap-3 p-4 ${!n.read_at ? "bg-brand-violet/5" : ""}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read_at ? "bg-brand-violet" : "bg-muted"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{n.source === "platform" ? "Account" : n.kind} · {new Date(n.created_at).toLocaleString("en-IN")}</div>
              </div>
              {!n.read_at ? (
                <button onClick={() => markOne(n)} className="rounded-lg border border-input px-2 py-1 text-[11px] hover:bg-accent">Mark read</button>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600" title={`Read ${new Date(n.read_at).toLocaleString("en-IN")}`}>
                  <Check className="h-3.5 w-3.5" /> Read
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
