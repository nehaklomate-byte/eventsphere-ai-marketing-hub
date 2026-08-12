import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

const TYPE_STYLE: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  error: "border-rose-500/30 bg-rose-500/5",
};

function dismissedKey(userId: string) {
  return `eo_dismissed_announcement_${userId}`;
}

/** Platform-wide announcements sent from the admin Broadcast Center.
 * Shows only the single most recent announcement, as one clean
 * dismissible banner — not a stack of every past broadcast. */
export function PlatformAnnouncements() {
  const { user } = useSession();
  const [dismissedId, setDismissedId] = useState<string | null>(() =>
    user?.id ? localStorage.getItem(dismissedKey(user.id)) : null
  );

  const { data } = useQuery({
    queryKey: ["platform-announcements", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_notifications" as never)
        .select("id, title, body, type, created_at" as never)
        .eq("user_id" as never, user!.id as never)
        .order("created_at" as never, { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data as unknown as { id: string; title: string; body: string | null; type: string; created_at: string }[])?.[0] ?? null;
    },
  });

  if (!data || data.id === dismissedId) return null;

  function dismiss() {
    if (user?.id) localStorage.setItem(dismissedKey(user.id), data!.id);
    setDismissedId(data!.id);
  }

  return (
    <div className={`relative rounded-xl border p-3.5 pr-9 text-sm ${TYPE_STYLE[data.type] ?? TYPE_STYLE.info}`}>
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Megaphone className="h-3 w-3" /> Announcement
      </div>
      <div className="mt-1 font-semibold">{data.title}</div>
      {data.body && <div className="mt-0.5 text-xs text-muted-foreground">{data.body}</div>}
    </div>
  );
}
