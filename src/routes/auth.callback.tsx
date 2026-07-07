import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveDashboardPath, DASHBOARD_PATH, type PrimaryRole } from "@/lib/auth-redirect";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — EventSphere AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function complete(userId: string) {
      // Apply any pending role captured during "Continue with Google" from /register
      const pending = (typeof window !== "undefined" && sessionStorage.getItem("pending_primary_role")) as PrimaryRole | null;
      if (pending && DASHBOARD_PATH[pending]) {
        sessionStorage.removeItem("pending_primary_role");
        const { data: prof } = await supabase
          .from("profiles")
          .select("primary_role")
          .eq("id", userId)
          .maybeSingle();
        if (!prof?.primary_role) {
          await supabase.from("profiles").update({ primary_role: pending }).eq("id", userId);
          await supabase.from("user_roles").insert({ user_id: userId, role: pending }).select();
        }
      }
      const path = await resolveDashboardPath(userId);
      if (!cancelled) navigate({ to: path, replace: true } as never);
    }

    async function poll() {
      for (let i = 0; i < 24; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return complete(data.session.user.id);
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!cancelled) {
        setMsg("We couldn't complete sign-in. Redirecting to login…");
        setTimeout(() => navigate({ to: "/login", replace: true } as never), 800);
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-violet" />
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    </div>
  );
}
