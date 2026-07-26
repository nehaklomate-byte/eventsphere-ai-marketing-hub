import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { fetchMyMemberships, PERMISSIONS, type PermissionKey } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/team-member/")({
  head: () => ({ meta: [{ title: "My Dashboard - EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: TeamMemberHome,
});

function TeamMemberHome() {
  const { data: memberships } = useQuery({ queryKey: ["my-memberships"], queryFn: fetchMyMemberships });
  const membership = memberships?.[0];
  const role = membership?.role ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the sidebar to work on the things you have access to. Here's your full permission list:
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {role?.is_admin_role ? (
          <p className="text-sm text-muted-foreground">Your role has full org-management access.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {PERMISSIONS.map((p) => {
              const has = role?.permissions.includes(p.key as PermissionKey) ?? false;
              return (
                <div key={p.key} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${has ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900" : "border-border text-muted-foreground"}`}>
                  {has ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                  {p.label}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Only Events, Departments and Invite Members are fully built and actionable right now (they show up in the
          sidebar if you have the matching permission). The rest of the permissions above are recorded and ready,
          but their actual screens (Certificates, Sponsors, Payments, QR Scan, Participants) are built in a later phase.
        </p>
      </div>
    </div>
  );
}
