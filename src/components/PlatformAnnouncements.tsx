import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

const TYPE_STYLE: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  error: "border-rose-500/30 bg-rose-500/5",
};

/** Platform-wide announcements sent from the admin Broadcast Center
 * (src/routes/_authenticated/admin/notifications.tsx → sendBroadcast()
 * in lib/admin.ts). Every role's notifications page had its own
 * separate table (worker_notifications, vendor_notifications, etc.)
 * with nothing reading platform_notifications — so a broadcast landed
 * in the DB but no user ever saw it. This closes that gap without
 * touching each page's existing list/mutations. */
export function PlatformAnnouncements() {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["platform-announcements", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_notifications" as never)
        .select("id, title, body, type, created_at" as never)
        .eq("user_id" as never, user!.id as never)
        .order("created_at" as never, { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data as unknown as { id: string; title: string; body: string | null; type: string; created_at: string }[]) ?? [];
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" /> Platform announcements
      </div>
      {data.map((n) => (
        <div key={n.id} className={`rounded-xl border p-3.5 text-sm ${TYPE_STYLE[n.type] ?? TYPE_STYLE.info}`}>
          <div className="font-semibold">{n.title}</div>
          {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
          <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN")}</div>
        </div>
      ))}
    </div>
  );
}
