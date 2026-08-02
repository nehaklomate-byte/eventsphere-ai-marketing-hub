import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { PasswordSection, NotificationPrefsSection, DangerZoneSection } from "@/components/AccountSettingsSections";

export const Route = createFileRoute("/_authenticated/venue/settings")({
  head: () => ({ meta: [{ title: "Settings — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold">Account</div>
          <div className="text-xs text-muted-foreground">{user?.email}</div>
        </div>
      </div>
      <PasswordSection />
      {user?.id && <NotificationPrefsSection userId={user.id} />}
      {user?.id && <DangerZoneSection userId={user.id} />}
    </div>
  );
}
