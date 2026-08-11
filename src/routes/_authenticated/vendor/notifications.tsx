import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Bell, Check, Trash2 } from "lucide-react";
import type { VendorNotification } from "@/lib/vendor";

export const Route = createFileRoute("/_authenticated/vendor/notifications")({
  head: () => ({ meta: [{ title: "Notifications — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

type Source = "vendor" | "platform";
type Notif = VendorNotification & { source: Source };

function tableFor(source: Source) {
  return source === "platform" ? "platform_notifications" : "vendor_notifications";
}

function NotificationsPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ["vendor-notifications", user?.id],
    queryFn: async () => {
      const [{ data: v, error: vErr }, { data: p, error: pErr }] = await Promise.all([
        supabase.from("vendor_notifications" as never).select("*").eq("user_id" as never, user!.id as never)
          .order("created_at" as never, { ascending: false }).limit(100),
        supabase.from("platform_notifications" as never).select("*").eq("user_id" as never, user!.id as never)
          .order("created_at" as never, { ascending: false }).limit(100),
      ]);
      if (vErr) throw vErr;
      if (pErr) throw pErr;
      const vendor = ((v ?? []) as unknown as VendorNotification[]).map((n) => ({ ...n, source: "vendor" as const }));
      const platform = ((p ?? []) as unknown as VendorNotification[]).map((n) => ({ ...n, category: "system" as VendorNotification["category"], source: "platform" as const }));
      return [...vendor, ...platform].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Notif[];
    },
    enabled: !!user?.id,
  });

  const markRead = useMutation({
    mutationFn: async (n: Notif) => {
      const { error } = await supabase.from(tableFor(n.source) as never)
        .update({ read_at: new Date().toISOString() } as never).eq("id" as never, n.id as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-notifications", user?.id] }); qc.invalidateQueries({ queryKey: ["vendor-notif-unread", user?.id] }); },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error: e1 } = await supabase.from("vendor_notifications" as never)
        .update({ read_at: new Date().toISOString() } as never)
        .eq("user_id" as never, user!.id as never).is("read_at" as never, null as never);
      const { error: e2 } = await supabase.from("platform_notifications" as never)
        .update({ read_at: new Date().toISOString() } as never)
        .eq("user_id" as never, user!.id as never).is("read_at" as never, null as never);
      if (e1) throw e1;
      if (e2) throw e2;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-notifications", user?.id] }); qc.invalidateQueries({ queryKey: ["vendor-notif-unread", user?.id] }); },
  });

  const del = useMutation({
    mutationFn: async (n: Notif) => {
      const { error } = await supabase.from(tableFor(n.source) as never).delete().eq("id" as never, n.id as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-notifications", user?.id] }),
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
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No notifications</p>
          <p className="mt-1 text-sm text-muted-foreground">You'll see it here the moment someone assigns you a job, updates one, or the admin team sends an account update.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={`${n.source}-${n.id}`} className={`group flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors ${n.read_at ? "border-border bg-card" : "border-brand-violet/30 bg-brand-violet/5"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {n.source === "platform" ? "Account" : n.category.replace("_", " ")}
                  </span>
                  {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-brand-violet" />}
                </div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">{n.title}</div>
                {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN")}</div>
              </div>
              <div className="flex items-center gap-1">
                {!n.read_at ? (
                  <button onClick={() => markRead.mutate(n)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent" title="Mark read"><Check className="h-3.5 w-3.5" /></button>
                ) : (
                  <span className="flex items-center gap-1 px-1 text-[11px] text-emerald-600" title={`Read ${new Date(n.read_at).toLocaleString("en-IN")}`}><Check className="h-3.5 w-3.5" /> Read</span>
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
