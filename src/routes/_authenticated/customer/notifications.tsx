import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["c-notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("customer_notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel("cn-page-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["c-notifications"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  async function markAll() {
    const { error } = await supabase.from("customer_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["c-notifications"] });
  }
  async function markOne(id: string) {
    await supabase.from("customer_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["c-notifications"] });
  }

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <PageShell title="Notifications" subtitle={unread ? `${unread} unread` : "You're all caught up."}
      action={unread > 0 ? (<button onClick={markAll} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent"><Check className="h-3.5 w-3.5" /> Mark all read</button>) : null}>
      {isLoading ? <LoadingRows /> : (data?.length ?? 0) === 0 ? (
        <EmptyState title="No notifications yet" description="We'll ping you here about booking updates, payments and offers." icon={Bell} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {data!.map((n) => (
            <li key={n.id} className={`flex items-start gap-3 p-4 ${!n.read_at ? "bg-brand-violet/5" : ""}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read_at ? "bg-brand-violet" : "bg-muted"}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{n.kind} · {new Date(n.created_at).toLocaleString("en-IN")}</div>
              </div>
              {!n.read_at && (
                <button onClick={() => markOne(n.id)} className="rounded-lg border border-input px-2 py-1 text-[11px] hover:bg-accent">Mark read</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
