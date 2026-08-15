import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: () => ({ meta: [{ title: "Activity Log — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: ActivityPage,
});

type EntityType = "halls" | "vendors" | "workers" | "customers" | "organizations" | "profiles" | "org_members";

const ENTITY_TABS: { value: "all" | EntityType; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "halls", label: "Venue" },
  { value: "vendors", label: "Vendor" },
  { value: "workers", label: "Worker" },
  { value: "customers", label: "Customer" },
  { value: "organizations", label: "Organization" },
  { value: "profiles", label: "Account (basic info)" },
];

const ENTITY_LABEL: Record<string, string> = {
  halls: "Venue", vendors: "Vendor", workers: "Worker", customers: "Customer",
  organizations: "Organization", profiles: "Account", org_members: "Team member",
};

const NAME_COLUMN: Record<EntityType, string> = {
  halls: "name", vendors: "business_name", workers: "full_name", customers: "full_name",
  organizations: "name", profiles: "full_name", org_members: "full_name",
};

type LogRow = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

async function fetchActivity(entityType: "all" | EntityType, fieldQuery: string): Promise<LogRow[]> {
  let q = supabase
    .from("profile_change_log" as never)
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
function displayValue(v: string | null): string {
  if (v === null || v === "") return "—";
  return v.length > 80 ? v.slice(0, 80) + "…" : v;
}

function ActivityPage() {
  const [entityType, setEntityType] = useState<"all" | EntityType>("all");
  const [fieldQuery, setFieldQuery] = useState("");
  const [q, setQ] = useState("");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-activity", entityType, fieldQuery],
    queryFn: () => fetchActivity(entityType, fieldQuery),
  });

  // Resolve entity display names (hall name / business name / person's
  // name / org name) and the display name of whoever made the change,
  // batched per table so a page of ~300 log rows costs only a handful
  // of extra queries instead of one per row.
  const { data: names } = useQuery({
    queryKey: ["admin-activity-names", rows?.map((r) => `${r.entity_type}:${r.entity_id}`).join(",")],
    enabled: !!rows && rows.length > 0,
    queryFn: async () => {
      const map: Record<string, string> = {};
      const byType = new Map<EntityType, Set<string>>();
      for (const r of rows ?? []) {
        if (!byType.has(r.entity_type)) byType.set(r.entity_type, new Set());
        byType.get(r.entity_type)!.add(r.entity_id);
      }
      await Promise.all(
        Array.from(byType.entries()).map(async ([type, ids]) => {
          const col = NAME_COLUMN[type];
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <History className="h-7 w-7 text-brand-violet" /> Activity Log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every profile field any role has changed — who changed it, from what, to what, and when.
          Useful for disputes: e.g. filter the field to "cancellation_policy" to see exactly what a
          venue/vendor/worker's cancellation policy said at any point in time.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ENTITY_TABS.map((t) => (
          <button key={t.value} onClick={() => setEntityType(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${entityType === t.value ? "bg-brand-violet text-white" : "border border-input hover:bg-accent"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name (venue/vendor/worker/customer/person)…"
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="relative w-64">
          <input value={fieldQuery} onChange={(e) => setFieldQuery(e.target.value)} placeholder="Field name, e.g. cancellation_policy"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading && <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {!isLoading && filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No changes found for these filters.</p>}
        {!isLoading && filtered.length > 0 && (
          <ol className="divide-y divide-border">
            {filtered.map((r) => {
              const entityName = names?.[`${r.entity_type}:${r.entity_id}`] ?? "…";
              const who = r.changed_by ? names?.[`who:${r.changed_by}`] ?? "…" : "System";
              return (
                <li key={r.id} className="p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{ENTITY_LABEL[r.entity_type]}</span>
                    <span className="font-semibold text-foreground">{entityName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{humanizeField(r.field_name)} updated</span>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    <span className="line-through">{displayValue(r.old_value)}</span>
                    {" → "}
                    <span className="font-medium text-foreground">{displayValue(r.new_value)}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    by {who} · {new Date(r.changed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
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
