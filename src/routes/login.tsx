import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { supabase as supabaseAuth } from "@/integrations/supabase/client";
import { emailSchema } from "@/lib/validation";
import { resolveDashboardPath, humanizeAuthError } from "@/lib/auth-redirect";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — EventSphere AI" },
      { name: "description", content: "Sign in to the EventSphere AI operations console." },
      { property: "og:title", content: "Log in — EventSphere AI" },
      { property: "og:description", content: "Sign in to EventSphere AI." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginPage,
});

const schema = z.object({ email: emailSchema, password: z.string().min(1, "Password is required") });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({});
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const path = await resolveDashboardPath(data.session.user.id);
        navigate({ to: path, replace: true } as never);
        return;
      }
      setChecked(true);
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setFieldErr({});
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0] as string] = i.message; });
      setFieldErr(fe);
      return;
    }
    setLoading(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    if (error) {
      setLoading(false);
      setError(humanizeAuthError(error));
      return;
    }
    const uid = signInData.user?.id;
    if (!uid) { setLoading(false); setError("Sign-in succeeded but no user session was returned. Please try again."); return; }
    const path = await resolveDashboardPath(uid);
    navigate({ to: path, replace: true } as never);
  }

  async function handleGoogle() {
    setGLoading(true); setError(null);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth/callback` });
    if (res.error) { setError("Google sign-in failed. Please try again."); setGLoading(false); return; }
    if (res.redirected) return;
    navigate({ to: "/auth/callback", replace: true } as never);
  }

  if (!checked) return <div className="grid min-h-dvh place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* LEFT — brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-brand text-white p-12">
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-brand-magenta/40 blur-3xl animate-float-slow" />
        <Link to="/" className="relative"><Logo variant="white" className="h-9" /></Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5" /> Operations console
          </span>
          <h2 className="mt-5 font-display text-4xl xl:text-5xl font-semibold leading-[1.05] tracking-tight">
            Manage every event with one intelligent platform.
          </h2>
          <p className="mt-4 max-w-md text-white/85 leading-relaxed">
            Sign in to run bookings, vendors, teams and budgets across your organization from a single secure workspace.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            {[
              "Role-based access for organizations, halls, vendors and staff",
              "Real-time booking calendar and enquiry inbox",
              "Enterprise-grade security with encrypted sessions",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4" /> {f}</li>
            ))}
          </ul>
        </motion.div>
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/70">
          <ShieldCheck className="h-4 w-4" /> Encrypted in transit and at rest • SOC 2 roadmap
        </div>
      </aside>

      {/* RIGHT — form */}
      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Link to="/"><Logo className="h-9" /></Link></div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to the EventSphere AI console.</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={gLoading || loading}
            className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-xl border border-input bg-card px-4 py-3 text-sm font-semibold hover:bg-accent transition disabled:opacity-60"
          >
            {gLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleG />} Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field label="Email address" htmlFor="email" error={fieldErr.email}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="email" type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10" placeholder="you@company.com" required />
              </div>
            </Field>

            <Field label="Password" htmlFor="password" error={fieldErr.password}
              trailing={<Link to="/login" search={undefined as never} className="text-xs font-semibold text-brand-violet hover:opacity-80">Forgot password?</Link>}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10 pr-10" placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-[color:var(--brand-violet)]" />
              Keep me signed in on this device
            </label>

            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold disabled:opacity-70">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            New to EventSphere? <Link to="/register" className="font-semibold text-brand-violet hover:opacity-80">Create an account</Link>
          </p>
          <p className="mt-8 text-[11px] text-muted-foreground">
            By signing in you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      <style>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--border); background: var(--card); padding: 10px 14px; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
        .input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 22%, transparent); }
      `}</style>
    </div>
  );
}

function Field({ label, htmlFor, error, trailing, children }: { label: string; htmlFor?: string; error?: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
        {trailing}
      </div>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7 12.9 19c1.8-4.4 6.1-7.5 11.1-7.5 3 0 5.8 1.1 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 34.9 26.8 36 24 36c-5.4 0-9.9-3.3-11.5-8l-6.6 5.1C9.6 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.5l6.3 5.3C41.9 35.5 44 30.1 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
