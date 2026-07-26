import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lookupInvite, acceptInvite } from "@/lib/organization";

export const Route = createFileRoute("/join-organization/$token")({
  head: () => ({ meta: [{ title: "Join Organization — EventOrbit AI" }] }),
  component: JoinOrganizationPage,
});

type Step =
  | "loading" | "need-auth" | "wrong-email" | "ready" | "done" | "error"
  | "check-inbox-confirm" | "check-inbox-magiclink";

function JoinOrganizationPage() {
  const { token } = Route.useParams();
  const [step, setStep] = useState<Step>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  /** Quick signup, scoped to this invite only — no role picker, no long
   *  form. Email is fixed to the invited address. */
  async function handleQuickSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setFormError(null);
    if (password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setFormError("Passwords don't match."); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: invite.invited_email,
        password,
        options: { data: { full_name: invite.full_name ?? undefined } },
      });
      if (error) throw error;

      if (data.session) {
        // Email confirmation is off (or auto-confirmed) — proceed right away.
        await acceptInvite(invite.id);
        setStep("done");
      } else {
        // Email confirmation required before a session exists.
        setStep("check-inbox-confirm");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  /** For people who already have an account but don't remember their
   *  password — passwordless magic-link login instead of forcing them
   *  to recall it. */
  async function handleMagicLink() {
    if (!invite) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: invite.invited_email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) throw error;
      setStep("check-inbox-magiclink");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't send the login link.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOutAndSwitch() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-muted/30 px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
        <Link to="/" className="mx-auto mb-6 flex justify-center"><Logo className="h-8" /></Link>

        {step === "loading" && (
          <div className="py-6"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}

        {step === "need-auth" && invite && (
          <>
            <h1 className="font-display text-xl font-semibold">You're invited to {invite.org_name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              As <span className="font-medium text-foreground">{invite.role_name}</span>. Set a password for{" "}
              <span className="font-medium text-foreground">{invite.invited_email}</span> to join instantly.
            </p>

            <form onSubmit={handleQuickSignup} className="mt-6 space-y-3 text-left">
              <div>
                <label className="text-sm font-medium">Set a password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm"
                />
              </div>
              {formError && <p className="text-sm text-rose-600">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-violet px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50"
              >
                {submitting ? "Joining…" : `Join ${invite.org_name}`}
              </button>
            </form>

            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> already have an account? <div className="h-px flex-1 bg-border" />
            </div>
            <button
              onClick={handleMagicLink}
              disabled={submitting}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-50"
            >
              <Mail className="h-4 w-4" /> Email me a login link instead
            </button>
          </>
        )}

        {step === "check-inbox-confirm" && invite && (
          <>
            <Mail className="mx-auto mb-3 h-9 w-9 text-brand-violet" />
            <h1 className="font-display text-xl font-semibold">Confirm your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium text-foreground">{invite.invited_email}</span>.
              Click it, then come back to <span className="font-medium text-foreground">this same invite link</span> to finish joining {invite.org_name}.
            </p>
          </>
        )}

        {step === "check-inbox-magiclink" && invite && (
          <>
            <Mail className="mx-auto mb-3 h-9 w-9 text-brand-violet" />
            <h1 className="font-display text-xl font-semibold">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a login link to <span className="font-medium text-foreground">{invite.invited_email}</span>.
              Open it on this device — you'll land right back here, already logged in.
            </p>
          </>
        )}

        {step === "wrong-email" && invite && (
          <>
            <XCircle className="mx-auto mb-3 h-9 w-9 text-amber-500" />
            <h1 className="font-display text-xl font-semibold">Wrong account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This invite was sent to <span className="font-medium text-foreground">{invite.invited_email}</span>, but you're
              logged in with a different email. Log out and use the invited email to accept.
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
