import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Bell, Check, Trash2 } from "lucide-react";
import { EmptyState } from "./index";
import type { WorkerNotification } from "@/lib/worker";

export const Route = createFileRoute("/_authenticated/worker/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker_notifications" as never)
        .select("*").eq("user_id" as never, user!.id as never)
        .order("created_at" as never, { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as WorkerNotification[];
    },
    enabled: !!user?.id,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("worker_notifications" as never)
        .update({ read_at: new Date().toISOString() } as never).eq("id" as never, id as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications", user?.id] }); qc.invalidateQueries({ queryKey: ["notif-unread", user?.id] }); },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("worker_notifications" as never)
        .update({ read_at: new Date().toISOString() } as never)
        .eq("user_id" as never, user!.id as never).is("read_at" as never, null as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications", user?.id] }); qc.invalidateQueries({ queryKey: ["notif-unread", user?.id] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("worker_notifications" as never).delete().eq("id" as never, id as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const unread = notifs.filter((n) => !n.read_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">{unread.length} unread · {notifs.length} total</p>
        </div>
        {unread.length > 0 && (
          <button onClick={() => markAllRead.mutate()} className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-accent">
            Mark all read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8">
          <EmptyState icon={Bell} title="No notifications" body="You're all caught up. New assignments and updates will appear here." />
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id} className={`group flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors ${n.read_at ? "border-border bg-card" : "border-brand-violet/30 bg-brand-violet/5"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{n.category.replace("_", " ")}</span>
                  {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-brand-violet" />}
                </div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">{n.title}</div>
                {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN")}</div>
              </div>
              <div className="flex items-center gap-1">
                {!n.read_at && (
                  <button onClick={() => markRead.mutate(n.id)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent" title="Mark read"><Check className="h-3.5 w-3.5" /></button>
                )}
                <button onClick={() => del.mutate(n.id)} className="grid h-8 w-8 place-items-center rounded-full text-rose-600 hover:bg-rose-500/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
