import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Bell, Check, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/organization/notifications")({
  head: () => ({ meta: [{ title: "Notifications — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

type Notif = { id: string; title: string; body: string | null; type: string; read_at: string | null; created_at: string };

const TYPE_STYLE: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  error: "border-rose-500/30 bg-rose-500/5",
};

async function fetchAll(userId: string): Promise<Notif[]> {
  const { data, error } = await supabase.from("platform_notifications" as never)
    .select("*").eq("user_id" as never, userId as never)
    .order("created_at" as never, { ascending: false }).limit(100);
  if (error) throw error;
  return (data as unknown as Notif[]) ?? [];
}

function NotificationsPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ["org-notifications", user?.id],
    queryFn: () => fetchAll(user!.id),
    enabled: !!user?.id,
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["org-notifications", user?.id] }); qc.invalidateQueries({ queryKey: ["org-notif-unread", user?.id] }); };

  const markRead = useMutation({
    mutationFn: async (n: Notif) => {
      const { error } = await supabase.from("platform_notifications" as never)
        .update({ read_at: new Date().toISOString() } as never).eq("id" as never, n.id as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("platform_notifications" as never)
        .update({ read_at: new Date().toISOString() } as never).eq("user_id" as never, user!.id as never).is("read_at" as never, null as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: async (n: Notif) => {
      const { error } = await supabase.from("platform_notifications" as never).delete().eq("id" as never, n.id as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const unread = notifs.filter((n) => !n.read_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread.length} unread · {notifs.length} total — account approvals, rejections and admin updates land here.
          </p>
        </div>
        {unread.length > 0 && (
          <button onClick={() => markAllRead.mutate()} className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-accent">
            Mark all read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No notifications</p>
          <p className="mt-1 text-sm text-muted-foreground">You'll see it here the moment the admin team updates your organization's status or sends an announcement.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id} className={`group flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors ${n.read_at ? "border-border bg-card" : (TYPE_STYLE[n.type] ?? TYPE_STYLE.info)}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-brand-violet" />}
                  <div className="text-sm font-semibold text-foreground">{n.title}</div>
                </div>
                {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN")}</div>
              </div>
              <div className="flex items-center gap-1">
                {!n.read_at && (
                  <button onClick={() => markRead.mutate(n)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent" title="Mark read"><Check className="h-3.5 w-3.5" /></button>
                )}
                <button onClick={() => del.mutate(n)} className="grid h-8 w-8 place-items-center rounded-full text-rose-600 hover:bg-rose-500/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
