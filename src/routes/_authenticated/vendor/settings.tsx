import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { Settings as SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vendor/settings")({
  head: () => ({ meta: [{ title: "Settings — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
        <SettingsIcon className="h-7 w-7 text-brand-violet" /> Settings
      </h1>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account email</div>
        <div className="mt-1.5 text-sm">{user?.email}</div>
      </div>
      <p className="text-xs text-muted-foreground">More settings (notification preferences, password change) are coming soon.</p>
    </div>
  );
}
