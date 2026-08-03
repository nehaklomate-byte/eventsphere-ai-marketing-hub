import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { AccountSettingsSection } from "@/components/AccountSettingsSection";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — EventOrbit AI Admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
        <SettingsIcon className="h-7 w-7 text-brand-violet" /> Settings
      </h1>
      <p className="text-sm text-muted-foreground -mt-4">
        Personal account settings for your own admin login. Platform-wide settings (commission %, verification
        rules, blocked IPs, etc.) are a separate, larger admin-only surface — not yet built.
      </p>
      <AccountSettingsSection />
    </div>
  );
}
