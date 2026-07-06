import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WorkerTask } from "@/lib/worker";

export const Route = createFileRoute("/_authenticated/worker/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { user } = useSession();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const { data: tasks = [] } = useQuery({
    queryKey: ["worker-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker_tasks" as never)
        .select("*").eq("worker_user_id" as never, user!.id as never);
      if (error) throw error;
      return (data ?? []) as unknown as WorkerTask[];
    },
    enabled: !!user?.id,
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayISO = new Date().toISOString().slice(0, 10);

  const byDate = new Map<string, WorkerTask[]>();
  tasks.forEach((t) => {
    const arr = byDate.get(t.event_date) ?? [];
    arr.push(t); byDate.set(t.event_date, arr);
  });

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  function toneFor(list: WorkerTask[], iso: string): string {
    if (list.some((t) => t.priority === "urgent" && t.status !== "completed")) return "bg-rose-500/15 border-rose-500/30 text-rose-700";
    if (iso === todayISO) return "bg-orange-500/15 border-orange-500/30 text-orange-700";
    if (list.every((t) => t.status === "completed")) return "bg-emerald-500/15 border-emerald-500/30 text-emerald-700";
    return "bg-blue-500/15 border-blue-500/30 text-blue-700";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your assigned jobs at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
          <div className="min-w-[140px] text-center text-sm font-semibold">{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <Legend color="bg-blue-500" label="Upcoming" />
        <Legend color="bg-emerald-500" label="Completed" />
        <Legend color="bg-orange-500" label="Today" />
        <Legend color="bg-rose-500" label="Urgent" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-semibold text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="h-24 rounded-xl bg-transparent" />;
            const iso = d.toISOString().slice(0, 10);
            const list = byDate.get(iso) ?? [];
            const hasJobs = list.length > 0;
            return (
              <div key={i} className={`h-24 rounded-xl border p-2 flex flex-col ${hasJobs ? toneFor(list, iso) : "border-border bg-muted/30"}`}>
                <div className="text-xs font-bold">{d.getDate()}</div>
                {hasJobs && (
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {list.slice(0, 2).map((t) => <div key={t.id} className="truncate text-[10px] font-medium">{t.task_name}</div>)}
                    {list.length > 2 && <div className="text-[10px] opacity-75">+{list.length - 2} more</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>;
}
