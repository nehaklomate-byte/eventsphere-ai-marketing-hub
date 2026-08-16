import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Search, Loader2, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: () => ({ meta: [{ title: "Activity Log — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: ActivityPage,
});

type ProfileEntityType = "halls" | "vendors" | "workers" | "customers" | "organizations" | "profiles" | "org_members";
type BookingEntityType = "customer_bookings" | "worker_tasks" | "vendor_tasks";
type Mode = "profile" | "booking";

const PROFILE_ENTITY_TABS: { value: "all" | ProfileEntityType; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "halls", label: "Venue" },
  { value: "vendors", label: "Vendor" },
  { value: "workers", label: "Worker" },
  { value: "customers", label: "Customer" },
  { value: "organizations", label: "Organization" },
  { value: "profiles", label: "Account (basic info)" },
];

const BOOKING_ENTITY_TABS: { value: "all" | BookingEntityType; label: string }[] = [
  { value: "all", label: "All bookings" },
  { value: "customer_bookings", label: "Hall bookings" },
  { value: "worker_tasks", label: "Worker tasks" },
  { value: "vendor_tasks", label: "Vendor tasks" },
];

const PROFILE_ENTITY_LABEL: Record<string, string> = {
  halls: "Venue", vendors: "Vendor", workers: "Worker", customers: "Customer",
  organizations: "Organization", profiles: "Account", org_members: "Team member",
};

const BOOKING_ENTITY_LABEL: Record<string, string> = {
  customer_bookings: "Hall booking", worker_tasks: "Worker task", vendor_tasks: "Vendor task",
};

const PROFILE_NAME_COLUMN: Record<ProfileEntityType, string> = {
  halls: "name", vendors: "business_name", workers: "full_name", customers: "full_name",
  organizations: "name", profiles: "full_name", org_members: "full_name",
};

const BOOKING_NAME_COLUMN: Record<BookingEntityType, string> = {
  customer_bookings: "target_name", worker_tasks: "task_name", vendor_tasks: "task_name",
};

const MONEY_FIELDS = new Set(["amount", "payment_amount", "commission_amount", "advance_amount"]);

type LogRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

async function fetchActivity(table: "profile_change_log" | "booking_activity_log", entityType: string, fieldQuery: string): Promise<LogRow[]> {
  let q = supabase
    .from(table as never)
    .select("id,entity_type,entity_id,field_name,old_value,new_value,changed_by,changed_at")
    .order("changed_at" as never, { ascending: false })
    .limit(300);
  if (entityType !== "all") q = q.eq("entity_type" as never, entityType as never);
  if (fieldQuery.trim()) q = q.ilike("field_name" as never, `%${fieldQuery.trim()}%` as never);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as LogRow[]) ?? [];
}

function humanizeField(field: string): string {
  return field.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function displayValue(v: string | null, isMoney: boolean): string {
  if (v === null || v === "") return "—";
  if (isMoney) {
    const n = Number(v);
    if (!Number.isNaN(n)) return `₹${n.toLocaleString("en-IN")}`;
  }
  return v.length > 80 ? v.slice(0, 80) + "…" : v;
}

function ActivityPage() {
  const [mode, setMode] = useState<Mode>("profile");
  const [entityType, setEntityType] = useState<string>("all");
  const [fieldQuery, setFieldQuery] = useState("");
  const [q, setQ] = useState("");

  const table = mode === "profile" ? "profile_change_log" : "booking_activity_log";
  const entityLabelMap = mode === "profile" ? PROFILE_ENTITY_LABEL : BOOKING_ENTITY_LABEL;
  const nameColumnMap = mode === "profile" ? PROFILE_NAME_COLUMN : BOOKING_NAME_COLUMN;
  const tabs = mode === "profile" ? PROFILE_ENTITY_TABS : BOOKING_ENTITY_TABS;

  function switchMode(next: Mode) {
    setMode(next);
    setEntityType("all");
    setFieldQuery("");
    setQ("");
  }

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-activity", table, entityType, fieldQuery],
    queryFn: () => fetchActivity(table, entityType, fieldQuery),
  });

  // Resolve entity display names (hall name / task name / person's
  // name / org name) and the display name of whoever made the change,
  // batched per table so a page of ~300 log rows costs only a handful
  // of extra queries instead of one per row.
  const { data: names } = useQuery({
    queryKey: ["admin-activity-names", table, rows?.map((r) => `${r.entity_type}:${r.entity_id}`).join(",")],
    enabled: !!rows && rows.length > 0,
    queryFn: async () => {
      const map: Record<string, string> = {};
      const byType = new Map<string, Set<string>>();
      for (const r of rows ?? []) {
        if (!byType.has(r.entity_type)) byType.set(r.entity_type, new Set());
        byType.get(r.entity_type)!.add(r.entity_id);
      }
      await Promise.all(
        Array.from(byType.entries()).map(async ([type, ids]) => {
          const col = nameColumnMap[type as keyof typeof nameColumnMap];
          if (!col) return;
          const { data } = await supabase.from(type as never).select(`id,${col}` as never).in("id" as never, Array.from(ids) as never);
          (data as unknown as Record<string, string>[] ?? []).forEach((row) => {
            map[`${type}:${row.id}`] = (row[col] as unknown as string) || "Untitled";
          });
        })
      );
      const changerIds = Array.from(new Set((rows ?? []).map((r) => r.changed_by).filter(Boolean))) as string[];
      if (changerIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", changerIds);
        (profs ?? []).forEach((p: { id: string; full_name: string | null }) => { map[`who:${p.id}`] = p.full_name ?? "Someone"; });
      }
      return map;
    },
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (!q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const entityName = names?.[`${r.entity_type}:${r.entity_id}`] ?? "";
      const whoName = r.changed_by ? names?.[`who:${r.changed_by}`] ?? "" : "";
      return (
        entityName.toLowerCase().includes(needle) ||
        whoName.toLowerCase().includes(needle) ||
        (r.old_value ?? "").toLowerCase().includes(needle) ||
        (r.new_value ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, names, q]);

  // Group flat field-level rows into one "update event" per save — every
  // field changed by the same UPDATE statement gets the exact same
  // changed_at timestamp (they're all inserted by one trigger firing),
  // so grouping on entity+changed_by+changed_at reliably reconstructs
  // "on this save, these N fields changed together" instead of showing
  // each field as an unrelated, scattered line.
  type Group = { key: string; entity_type: string; entity_id: string; changed_by: string | null; changed_at: string; fields: LogRow[] };
  const grouped = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of filtered) {
      const key = `${r.entity_type}:${r.entity_id}:${r.changed_by ?? "system"}:${r.changed_at}`;
      if (!map.has(key)) map.set(key, { key, entity_type: r.entity_type, entity_id: r.entity_id, changed_by: r.changed_by, changed_at: r.changed_at, fields: [] });
      map.get(key)!.fields.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <History className="h-7 w-7 text-brand-violet" /> Activity Log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "profile"
            ? "Every profile save any role has made — every field that changed in that save, its old value and its new value, who did it, and when. Useful for disputes: e.g. filter the field to \"cancellation_policy\" to see exactly what a venue/vendor/worker's cancellation policy said at any point in time."
            : "Every save that changed a booking or task's status, payment status, amount, or commission — old value, new value, who, when. This is the money-side audit trail, separate from profile-field changes."}
        </p>
      </div>

      <div className="flex gap-1.5 rounded-full border border-border bg-card p-1 text-sm w-fit">
        <button onClick={() => switchMode("profile")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold transition ${mode === "profile" ? "bg-brand-violet text-white" : "text-muted-foreground hover:bg-accent"}`}>
          <History className="h-3.5 w-3.5" /> Profile changes
        </button>
        <button onClick={() => switchMode("booking")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold transition ${mode === "booking" ? "bg-brand-violet text-white" : "text-muted-foreground hover:bg-accent"}`}>
          <IndianRupee className="h-3.5 w-3.5" /> Bookings & commission
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => setEntityType(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${entityType === t.value ? "bg-brand-violet text-white" : "border border-input hover:bg-accent"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={mode === "profile" ? "Search by name (venue/vendor/worker/customer/person)…" : "Search by booking/task name or who changed it…"}
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="relative w-64">
          <input value={fieldQuery} onChange={(e) => setFieldQuery(e.target.value)}
            placeholder={mode === "profile" ? "Field name, e.g. cancellation_policy" : "Field, e.g. commission_amount, status"}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading && <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {!isLoading && grouped.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No changes found for these filters.</p>}
        {!isLoading && grouped.length > 0 && (
          <ol className="divide-y divide-border">
            {grouped.map((g) => {
              const entityName = names?.[`${g.entity_type}:${g.entity_id}`] ?? "…";
              const who = g.changed_by ? names?.[`who:${g.changed_by}`] ?? "…" : "System";
              return (
                <li key={g.key} className="p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{entityLabelMap[g.entity_type] ?? g.entity_type}</span>
                    <span className="font-semibold text-foreground">{entityName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{g.fields.length === 1 ? "1 field updated" : `${g.fields.length} fields updated`}</span>
                  </div>
                  <ul className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
                    {g.fields.map((f) => {
                      const isMoney = MONEY_FIELDS.has(f.field_name);
                      return (
                        <li key={f.id} className="text-xs">
                          <span className="font-semibold text-foreground">{humanizeField(f.field_name)}: </span>
                          <span className="line-through text-muted-foreground">{displayValue(f.old_value, isMoney)}</span>
                          {" → "}
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">{displayValue(f.new_value, isMoney)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    by {who} · {new Date(g.changed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
