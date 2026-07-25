import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lookupInvite, acceptInvite } from "@/lib/organization";

export const Route = createFileRoute("/join-organization/$token")({
  head: () => ({ meta: [{ title: "Join Organization — EventOrbit AI" }] }),
  component: JoinOrganizationPage,
});

function JoinOrganizationPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<"loading" | "need-auth" | "wrong-email" | "ready" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite-lookup", token],
    queryFn: () => lookupInvite(token),
  });

  useEffect(() => {
    async function check() {
      if (isLoading) return;
      if (!invite) { setStep("error"); setErrorMsg("This invite link isn't valid, or has already been used."); return; }
      if (invite.status === "active") { setStep("done"); return; }
      if (invite.invite_expires_at && new Date(invite.invite_expires_at) < new Date()) {
        setStep("error"); setErrorMsg("This invite link has expired. Ask the organization to send a new one.");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setStep("need-auth"); return; }
      if (userData.user.email?.toLowerCase() !== invite.invited_email.toLowerCase()) {
        setStep("wrong-email");
        return;
      }
      setStep("ready");
    }
    check();
  }, [invite, isLoading]);

  async function handleAccept() {
    if (!invite) return;
    try {
      await acceptInvite(invite.id);
      setStep("done");
    } catch (e) {
      setStep("error");
      setErrorMsg(e instanceof Error ? e.message : "Couldn't accept the invite.");
    }
  }

  async function signOutAndSwitch() {
    await supabase.auth.signOut();
    navigate({ to: "/login", search: { redirect: `/join-organization/${token}` } as never } as never);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-muted/30 px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
        <Link to="/" className="mx-auto mb-6 flex justify-center"><Logo className="h-8" /></Link>

        {(step === "loading") && (
          <div className="py-6"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}

        {step === "need-auth" && invite && (
          <>
            <h1 className="font-display text-xl font-semibold">You're invited to {invite.org_name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              As <span className="font-medium text-foreground">{invite.role_name}</span>. Sign up or log in using{" "}
              <span className="font-medium text-foreground">{invite.invited_email}</span> to accept.
            </p>
            <Link
              to="/register"
              search={{ email: invite.invited_email, redirect: `/join-organization/${token}` } as never}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90"
            >
              Create account with {invite.invited_email}
            </Link>
            <Link
              to="/login"
              search={{ redirect: `/join-organization/${token}` } as never}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              I already have an account — Log in
            </Link>
          </>
        )}

        {step === "wrong-email" && invite && (
          <>
            <XCircle className="mx-auto mb-3 h-9 w-9 text-amber-500" />
            <h1 className="font-display text-xl font-semibold">Wrong account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This invite was sent to <span className="font-medium text-foreground">{invite.invited_email}</span>, but you're
              logged in with a different email. Log out and sign in with the invited email to accept.
            </p>
            <button onClick={signOutAndSwitch} className="mt-6 w-full rounded-full bg-brand-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90">
              Log out and switch account
            </button>
          </>
        )}

        {step === "ready" && invite && (
          <>
            <h1 className="font-display text-xl font-semibold">Join {invite.org_name}?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You'll join as <span className="font-medium text-foreground">{invite.role_name}</span>.
            </p>
            <button onClick={handleAccept} className="mt-6 w-full rounded-full bg-brand-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90">
              Accept invite
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-500" />
            <h1 className="font-display text-xl font-semibold">You're in!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your account is now linked to the organization.</p>
            <Link to="/organization/members" className="mt-6 flex w-full items-center justify-center rounded-full bg-brand-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90">
              Go to dashboard
            </Link>
          </>
        )}

        {step === "error" && (
          <>
            <XCircle className="mx-auto mb-3 h-9 w-9 text-rose-500" />
            <h1 className="font-display text-xl font-semibold">Invite not valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
}
