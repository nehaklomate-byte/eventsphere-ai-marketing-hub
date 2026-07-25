import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveDashboardPath, DASHBOARD_PATH, type PrimaryRole } from "@/lib/auth-redirect";
import { insertRoleRow, type Role } from "@/lib/registration";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — EventOrbit AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

// Reads Supabase's own error reporting, which arrives as either query params
// (?error=...&error_description=...) or a URL hash fragment
// (#error=...&error_description=...) depending on the auth flow. The
// previous version of this page never checked for these — if Supabase
// rejected the confirmation link (most commonly because the click landed on
// a domain that isn't in the project's allowed Redirect URLs), the page just
// spun forever with no explanation.
function readAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const desc = search.get("error_description") || hash.get("error_description");
  const err = search.get("error") || hash.get("error");
  if (desc) return decodeURIComponent(desc.replace(/\+/g, " "));
  if (err) return err;
  return null;
}

function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Signing you in…");
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const urlError = readAuthError();
    if (urlError) {
      setFatalError(urlError);
      return;
    }

    async function complete(userId: string) {
      // Case A: Google OAuth sign-up — role was chosen before the redirect,
      // profile row exists (via the handle_new_user trigger) but with no role yet.
      const pendingRole = (typeof window !== "undefined" && sessionStorage.getItem("pending_primary_role")) as PrimaryRole | null;
      if (pendingRole && DASHBOARD_PATH[pendingRole]) {
        sessionStorage.removeItem("pending_primary_role");
        const { data: prof } = await supabase
          .from("profiles")
          .select("primary_role")
          .eq("id", userId)
          .maybeSingle();
        if (!prof?.primary_role) {
          await supabase.from("profiles").update({ primary_role: pendingRole }).eq("id", userId);
          await supabase.from("user_roles").insert({ user_id: userId, role: pendingRole }).select();
        }
      }

      // Case B: email/password sign-up where email confirmation was
      // required. register.tsx couldn't create the halls/vendors/workers/
      // organizations row at signup time (no session yet = RLS blocks it),
      // so it saved the submitted form here instead. Now that confirming
      // the email has produced a real session, finish that step.
      const pendingRegistrationRaw = typeof window !== "undefined" ? sessionStorage.getItem("pending_registration") : null;
      if (pendingRegistrationRaw) {
        sessionStorage.removeItem("pending_registration");
        try {
          const { role, data } = JSON.parse(pendingRegistrationRaw) as { role: Role; data: Record<string, string> };
          if (role !== "customer") {
            // Only insert if it doesn't already exist (e.g. user clicked the
            // confirmation link twice, or completed it another way already).
            const table = role === "hall_owner" ? "halls" : role === "organization" ? "organizations" : role === "vendor" ? "vendors" : "workers";
            const { data: existing } = await supabase.from(table as never).select("id" as never).eq("owner_id" as never, userId as never).maybeSingle();
            if (!existing) await insertRoleRow(role, userId, data);
          }
        } catch {
          // Malformed/missing saved data — nothing to recover; the person
          // can complete their profile manually from their dashboard instead.
        }
      }

      const path = await resolveDashboardPath(userId);
      if (!cancelled) navigate({ to: path, replace: true } as never);
    }

    async function poll() {
      for (let i = 0; i < 24; i++) {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          if (!cancelled) setFatalError(error.message);
          return;
        }
        if (data.session?.user) return complete(data.session.user.id);
        if (i === 8 && !cancelled) setMsg("Still working — this can take a few seconds…");
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!cancelled) {
        setFatalError(
          "We couldn't complete sign-in. The confirmation link may have expired, already been used, or this site's URL isn't registered in Supabase's allowed redirect URLs."
        );
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [navigate]);

  if (fatalError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-500" />
          <h1 className="font-display text-lg font-semibold">Sign-in didn't complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">{fatalError}</p>
          <button
            onClick={() => navigate({ to: "/login" } as never)}
            className="mt-5 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-violet" />
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    </div>
  );
}
