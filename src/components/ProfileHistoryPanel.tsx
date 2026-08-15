// Path: src/components/ProfileHistoryPanel.tsx
// Shows a chronological log of who changed which profile field, and
// when — for any role's profile row. Backed by the generic
// profile_change_log table + trigger (see migration
// 20260814090000_profile_change_history.sql), so it picks up edits
// made from any page, not just the one this panel is embedded in.
import { useEffect, useState } from "react";
import { History, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export type ProfileEntityType = "halls" | "vendors" | "workers" | "customers" | "profiles" | "organizations" | "org_members";

type ChangeRow = {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

function humanizeField(field: string): string {
  return field
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function displayValue(v: string | null): string {
  if (v === null || v === "") return "—";
  if (v.length > 60) return v.slice(0, 60) + "…";
  return v;
}

export function ProfileHistoryPanel({ entityType, entityId }: { entityType: ProfileEntityType; entityId: string | null | undefined }) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded || !entityId) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("profile_change_log" as never)
        .select("id,field_name,old_value,new_value,changed_by,changed_at")
        .eq("entity_type" as never, entityType as never)
        .eq("entity_id" as never, entityId as never)
        .order("changed_at" as never, { ascending: false })
        .limit(100);
      if (!error && data) {
        const list = data as unknown as ChangeRow[];
        setRows(list);
        const ids = Array.from(new Set(list.map((r) => r.changed_by).filter(Boolean))) as string[];
        if (ids.length) {
          const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
          const map: Record<string, string> = {};
          (profs ?? []).forEach((p: { id: string; full_name: string | null }) => { map[p.id] = p.full_name ?? "Someone"; });
          setNames(map);
        }
      }
      setLoading(false);
      setLoaded(true);
    })();
  }, [open, loaded, entityId, entityType]);

  if (!entityId) return null;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left text-sm font-semibold text-foreground"
      >
        <span className="flex items-center gap-2"><History className="h-4 w-4 text-brand-violet" /> Profile Update History</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading history…</div>
          )}
          {!loading && rows.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No changes recorded yet.</p>
          )}
          {!loading && rows.length > 0 && (
            <ol className="space-y-4">
              {rows.map((r) => {
                const who = r.changed_by === user?.id ? "You" : r.changed_by ? (names[r.changed_by] ?? "Someone") : "System";
                return (
                  <li key={r.id} className="border-l-2 border-brand-violet/30 pl-4 text-sm">
                    <div className="font-medium text-foreground">{humanizeField(r.field_name)} updated</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
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
      )}
    </div>
  );
}
