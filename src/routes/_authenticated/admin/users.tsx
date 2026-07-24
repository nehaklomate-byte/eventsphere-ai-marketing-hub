import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users as UsersIcon, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: UsersPage,
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  primary_role: string | null;
  email_verified: boolean;
  created_at: string;
};

const ROLE_STYLE: Record<string, string> = {
  admin: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900",
  organization: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  hall_owner: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  vendor: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  worker: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  customer: "bg-muted text-muted-foreground",
};

const ROLE_TABS = ["all", "customer", "hall_owner", "vendor", "worker", "organization", "admin"] as const;

async function fetchAllProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, primary_role, email_verified, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data as ProfileRow[]) ?? [];
}

function UsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-all-users"], queryFn: fetchAllProfiles });
  const [roleTab, setRoleTab] = useState<(typeof ROLE_TABS)[number]>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    let r = data ?? [];
    if (roleTab !== "all") r = r.filter((u) => u.primary_role === roleTab);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      r = r.filter((u) => u.email?.toLowerCase().includes(needle) || u.full_name?.toLowerCase().includes(needle) || u.phone?.includes(needle));
    }
    return r;
  }, [data, roleTab, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
          <UsersIcon className="h-7 w-7 text-brand-violet" /> Users
        </h1>
        <p className="mt-1 text-muted-foreground">Every account registered on the platform, across all roles.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full rounded-full border border-input bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-violet"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((r) => (
          <button
            key={r}
            onClick={() => setRoleTab(r)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
              roleTab === r ? "bg-brand-violet text-white" : "border border-border bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            {r === "all" ? "All" : r.replace("_", " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading users…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No users match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{u.full_name || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${ROLE_STYLE[u.primary_role ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                      {(u.primary_role ?? "unset").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
