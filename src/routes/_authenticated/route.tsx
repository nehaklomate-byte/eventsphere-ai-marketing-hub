import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { PlatformAnnouncements } from "@/components/PlatformAnnouncements";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }
    return { user: data.user };
  },
  component: () => (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-3">
        <PlatformAnnouncements />
      </div>
      <Outlet />
      <NotificationPermissionPrompt />
    </>
  ),
});
