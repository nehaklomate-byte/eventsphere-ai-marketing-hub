import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { AccountSettingsSection } from "@/components/AccountSettingsSections";

export const Route = createFileRoute("/_authenticated/venue/settings")({
  head: () => ({ meta: [{ title: "Settings — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
        <SettingsIcon className="h-7 w-7 text-brand-violet" /> Settings
      </h1>
      <AccountSettingsSection />
    </div>
  );
}
