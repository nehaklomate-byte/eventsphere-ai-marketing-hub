import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Building2, Store, UserCheck, Users2, User, CheckCircle2, Loader2,
  Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles, Mail,
} from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, phoneSchema, passwordSchema, passwordStrength } from "@/lib/validation";
import { DASHBOARD_PATH, resolveDashboardPath, humanizeAuthError } from "@/lib/auth-redirect";
import { insertRoleRow, type Role } from "@/lib/registration";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — EventOrbit AI" },
      { name: "description", content: "Register your organization, venue, vendor profile or personal account on EventOrbit AI." },
      { property: "og:title", content: "Create your account — EventOrbit AI" },
      { property: "og:description", content: "Join EventOrbit AI." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/register" }],
  }),
  component: RegisterPage,
});

// "organization" is intentionally left out of this public list for now —
// during the closed-beta phase org accounts are onboarded manually by
// admin, not self-registered. The role, its dashboard, and its RLS
// policies are untouched — re-add the line below whenever public
// organization sign-up should open back up:
//   { id: "organization", title: "Organization", desc: "Corporates, agencies and event planning teams.", icon: Building2 },
const ROLES: { id: Role; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "hall_owner", title: "Venue Owner", desc: "Banquet halls, lawns, resorts and convention centers.", icon: Building2 },
  { id: "vendor", title: "Vendor", desc: "Decorators, caterers, photographers, sound, DJs and more.", icon: Store },
  { id: "worker", title: "Worker", desc: "Stewards, chefs, technicians and on-ground crew.", icon: UserCheck },
  { id: "customer", title: "Customer", desc: "Individuals booking venues or services for personal events.", icon: User },
];

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [role, setRole] = useState<Role | null>(null);
  const [checked, setChecked] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

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

  if (!checked) return <div className="grid min-h-dvh place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 glass-strong border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 md:px-8 py-3">
          <Logo className="h-8" />
          <div className="text-xs text-muted-foreground">
            Already a member? <Link to="/login" className="font-semibold text-brand-violet">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 md:px-8 py-10 md:py-14">
        <Progress step={step} />
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section key="role" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <SectionHeader eyebrow="Step 1 of 2" title="How will you use EventOrbit?" description="Pick the role that best describes you. You can add more roles from your workspace later." />
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ROLES.map((r) => {
                  const active = role === r.id;
                  return (
                    <button key={r.id} type="button" onClick={() => setRole(r.id)}
                      className={`text-left rounded-2xl border p-5 transition ${active ? "border-brand-violet shadow-glow bg-accent/40" : "border-border bg-card hover:border-brand-violet/40"}`}>
                      <div className={`grid h-11 w-11 place-items-center rounded-xl ${active ? "bg-gradient-brand text-white" : "bg-accent text-brand-violet"}`}>
                        <r.icon className="h-5 w-5" />
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                        {active && <CheckCircle2 className="h-4 w-4 text-brand-violet" />}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-10 flex items-center justify-between">
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
                <button disabled={!role} onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold disabled:opacity-50">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.section>
          )}

          {step === 1 && role && (
            <RoleForm
              key={role}
              role={role}
              onBack={() => setStep(0)}
              onDone={(awaiting) => { setAwaitingConfirmation(awaiting); setStep(2); }}
            />
          )}

          {step === 2 && (
            <motion.section key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg text-center py-16">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-white shadow-glow">
                {awaitingConfirmation ? <Mail className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
              </div>
              {awaitingConfirmation ? (
                <>
                  <h2 className="mt-6 font-display text-3xl font-semibold">Check your email</h2>
                  <p className="mt-2 text-muted-foreground">
                    We've sent a confirmation link to your inbox. Click it to activate your account — your
                    details are saved and will be submitted automatically the moment you confirm.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-6 font-display text-3xl font-semibold">You're all set.</h2>
                  <p className="mt-2 text-muted-foreground">Your account has been created. Opening your workspace…</p>
                  <Link to="/auth/callback" className="mt-8 inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">
                    Continue <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  const items = ["Choose role", "Your details", "Done"];
  return (
    <ol className="mx-auto flex max-w-2xl items-center gap-3 text-xs">
      {items.map((it, i) => {
        const done = i < step, active = i === step;
        return (
          <li key={it} className="flex items-center gap-3 flex-1">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${done || active ? "bg-gradient-brand text-white" : "bg-accent text-muted-foreground"}`}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{it}</span>
            {i < items.length - 1 && <span className={`h-px flex-1 ${done ? "bg-brand-violet" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-violet">
        <Sparkles className="h-3 w-3" /> {eyebrow}
      </span>
      <h1 className="mt-4 font-display text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
    </div>
  );
}

/* --------- ROLE-SPECIFIC FORM --------- */
function RoleForm({ role, onBack, onDone }: { role: Role; onBack: () => void; onDone: (awaitingConfirmation: boolean) => void }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string | boolean | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [accept, setAccept] = useState(false);

  const set = (k: string, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));

  const schema = useMemo(() => buildSchema(role), [role]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerErr(null); setErrors({});
    if (!accept) { setServerErr("Please accept the Terms and Privacy Policy to continue."); return; }
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fe[i.path.join(".")] = i.message; });
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    const data = parsed.data as Record<string, string>;

    // 1. Sign up with role metadata (handle_new_user trigger creates profile + user_role,
    //    regardless of whether email confirmation is required — that part always works).
    const { data: auth, error: signErr } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: data.owner_full_name || data.full_name || data.name,
          phone: data.phone,
          primary_role: role,
        },
      },
    });
    if (signErr) {
      setServerErr(humanizeAuthError(signErr));
      setSubmitting(false); return;
    }

    if (!auth.session) {
      // Email confirmation is required — there's no session yet, so we
      // cannot insert the role-specific row now (RLS needs auth.uid() to
      // check owner_id against, and there's no authenticated request
      // context until the email is confirmed). Save everything and let
      // /auth/callback finish this step once they confirm.
      sessionStorage.setItem("pending_registration", JSON.stringify({ role, data }));
      setSubmitting(false);
      onDone(true);
      return;
    }

    // Confirmation wasn't required (or was already satisfied) — a real
    // session exists right now, so it's safe to insert immediately.
    const err = await insertRoleRow(role, auth.session.user.id, data);
    setSubmitting(false);
    if (err) { setServerErr(err); return; }
    onDone(false);
    navigate({ to: DASHBOARD_PATH[role], replace: true } as never);
  }

  async function handleGoogle() {
    setServerErr(null);
    sessionStorage.setItem("pending_primary_role", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setServerErr("Google sign-in failed. Please try again.");
  }

  const pw = String(values.password ?? "");
  const strength = passwordStrength(pw);

  return (
    <motion.section key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
      <SectionHeader eyebrow="Step 2 of 2" title={roleTitle(role)} description={roleDesc(role)} />

      <div className="mx-auto mt-8 max-w-3xl">
        {role !== "customer" && role !== "worker" && (
          <>
            <button type="button" onClick={handleGoogle}
              className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-input bg-card px-4 py-3 text-sm font-semibold hover:bg-accent transition">
              Continue with Google
            </button>
            <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or fill in your details <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {serverErr && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{serverErr}</span>
          </div>
        )}

        <form onSubmit={submit} noValidate className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-soft space-y-6">
          <FieldGroup fields={fieldsFor(role)} values={values} errors={errors} onChange={set} />

          {/* Passwords + terms — every role except OAuth-only path */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrap label="Password" required error={errors.password}>
              <div className="relative">
                <input type={show1 ? "text" : "password"} className="input pr-10" placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={String(values.password ?? "")} onChange={(e) => set("password", e.target.value)} />
                <button type="button" onClick={() => setShow1(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center text-muted-foreground hover:bg-accent rounded-md">
                  {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pw && (
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
                    <div className={`h-full transition-all ${["bg-destructive","bg-destructive","bg-brand-orange","bg-brand-orange","bg-brand-violet","bg-brand-blue"][strength.score]}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                  </div>
                  <span className="text-muted-foreground">{strength.label}</span>
                </div>
              )}
            </FieldWrap>
            <FieldWrap label="Confirm password" required error={errors.confirm_password}>
              <div className="relative">
                <input type={show2 ? "text" : "password"} className="input pr-10" placeholder="Repeat your password"
                  value={String(values.confirm_password ?? "")} onChange={(e) => set("confirm_password", e.target.value)} />
                <button type="button" onClick={() => setShow2(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center text-muted-foreground hover:bg-accent rounded-md">
                  {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FieldWrap>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input accent-[color:var(--brand-violet)]" />
            <span className="text-muted-foreground">
              I agree to the <Link to="/terms" className="font-semibold text-brand-violet underline">Terms of Service</Link> and <Link to="/privacy" className="font-semibold text-brand-violet underline">Privacy Policy</Link>, and consent to email verification.
            </span>
          </label>

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Change role
            </button>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-6 py-3 text-sm font-semibold disabled:opacity-70">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create account
            </button>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Your data is encrypted and never sold.
          </p>
        </form>
      </div>

      <style>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--border); background: var(--background); padding: 10px 14px; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
        .input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 22%, transparent); }
        select.input { appearance: none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>"); background-repeat:no-repeat; background-position:right 12px center; padding-right:36px; }
        textarea.input { min-height: 88px; resize: vertical; }
      `}</style>
    </motion.section>
  );
}

/* ---------- Field renderers ---------- */
type FieldDef =
  | { name: string; label: string; type?: "text" | "email" | "tel" | "url" | "number" | "textarea" | "select" | "checkbox"; required?: boolean; placeholder?: string; options?: string[]; full?: boolean; hint?: string };

function FieldGroup({ fields, values, errors, onChange }: {
  fields: FieldDef[];
  values: Record<string, string | boolean | undefined>;
  errors: Record<string, string>;
  onChange: (k: string, v: string | boolean) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const v = values[f.name];
        const err = errors[f.name];
        const wrapCls = f.full || f.type === "textarea" ? "sm:col-span-2" : "";
        if (f.type === "checkbox") {
          return (
            <label key={f.name} className={`flex items-center gap-2 text-sm ${wrapCls}`}>
              <input type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(f.name, e.target.checked)}
                className="h-4 w-4 rounded border-input accent-[color:var(--brand-violet)]" />
              {f.label}
            </label>
          );
        }
        return (
          <div key={f.name} className={wrapCls}>
            <FieldWrap label={f.label} required={f.required} error={err} hint={f.hint}>
              {f.type === "select" ? (
                <select className="input" value={String(v ?? "")} onChange={(e) => onChange(f.name, e.target.value)}>
                  <option value="" disabled>Select…</option>
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea className="input" placeholder={f.placeholder} value={String(v ?? "")} onChange={(e) => onChange(f.name, e.target.value)} />
              ) : (
                <input type={f.type ?? "text"} className="input" placeholder={f.placeholder}
                  value={String(v ?? "")} onChange={(e) => onChange(f.name, e.target.value)} />
              )}
            </FieldWrap>
          </div>
        );
      })}
    </div>
  );
}

function FieldWrap({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
        : hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ---------- Copy + fields per role ---------- */
function roleTitle(r: Role) {
  return ({
    organization: "Register your organization",
    hall_owner: "List your venue",
    vendor: "Join as a vendor",
    worker: "Join as a professional",
    customer: "Create your account",
  } as const)[r];
}
function roleDesc(r: Role) {
  return ({
    organization: "Just the basics to open your workspace — you'll complete your organization profile after signing in.",
    hall_owner: "Just the basics to create your account — capacity, pricing, photos and documents come later in your Venue Profile.",
    vendor: "Just the basics to create your account — GST, PAN, portfolio and pricing come later in your Vendor Profile.",
    worker: "Just the basics to create your account — skills, charges, documents and availability come later in your Worker Profile.",
    customer: "Book venues and services for weddings, birthdays and private events.",
  } as const)[r];
}

const IND_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Chandigarh","Puducherry","Jammu and Kashmir","Ladakh"];

/**
 * STAGE 1 ONLY — account creation.
 * Business details (GST, PAN, pricing, capacity, portfolio, documents,
 * bank details, policies…) are collected later in each role's
 * Complete Profile page before submitting for verification.
 */
function fieldsFor(role: Role): FieldDef[] {
  const contact: FieldDef[] = [
    { name: "email", label: "Email address", type: "email", required: true, placeholder: "you@example.com" },
    { name: "phone", label: "Mobile number", type: "tel", required: true, placeholder: "10-digit mobile" },
  ];
  const place: FieldDef[] = [
    { name: "city", label: "City", required: true, placeholder: "e.g., Pune" },
    { name: "state", label: "State", type: "select", required: true, options: IND_STATES },
  ];

  if (role === "organization") return [
    { name: "name", label: "Organization name", required: true, placeholder: "Meridian Events Pvt. Ltd." },
    { name: "org_type", label: "Organization type", type: "select", required: true, options: ["Private Limited","LLP","Partnership","Proprietorship","NGO / Trust","Government","Educational Institution"] },
    ...contact,
    { name: "city", label: "City", required: true, placeholder: "e.g., Pune" },
    { name: "state", label: "State", type: "select", options: IND_STATES },
  ];

  if (role === "hall_owner") return [
    { name: "name", label: "Venue / business name", required: true, placeholder: "The Grand Lawns" },
    { name: "owner_full_name", label: "Owner name", required: true, placeholder: "Priya Sharma" },
    { name: "category", label: "Venue type", type: "select", required: true, options: ["Banquet","Wedding Hall","Convention Center","Community Hall","Lawn / Garden","Resort","Rooftop"] },
    ...contact, ...place,
  ];

  if (role === "vendor") return [
    { name: "name", label: "Business / service name", required: true, placeholder: "Bloom Decorators" },
    { name: "owner_full_name", label: "Owner name", required: true, placeholder: "Priya Sharma" },
    { name: "category", label: "Primary service category", type: "select", required: true, options: ["Decorator","Caterer","Photographer","Videographer","Sound & Lighting","DJ","Anchor / MC","Florist","Bartender","Rentals","Transport","Others"] },
    ...contact, ...place,
  ];

  if (role === "worker") return [
    { name: "full_name", label: "Full name", required: true, placeholder: "Rahul Kadam" },
    { name: "category", label: "Primary skill", type: "select", required: true, options: ["Steward","Chef","Waiter","Bartender","Housekeeping","Security","Technician","Sound Engineer","Lighting Tech","Driver","Cleaner","Coordinator"] },
    ...contact, ...place,
  ];

  // customer
  return [
    { name: "full_name", label: "Full name", required: true, placeholder: "Priya Sharma" },
    ...contact, ...place,
  ];
}

function buildSchema(role: Role) {
  const base: Record<string, z.ZodType> = {
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirm_password: z.string(),
    city: z.string().trim().min(2, "Required"),
  };
  const nameKey = role === "worker" || role === "customer" ? "full_name" : "name";
  base[nameKey] = z.string().trim().min(2, "Required");
  if (role === "hall_owner" || role === "vendor") base.owner_full_name = z.string().trim().min(2, "Required");
  if (role === "organization") base.org_type = z.string().min(1, "Required");
  if (role !== "organization") base.state = z.string().min(1, "Required");
  if (role === "hall_owner" || role === "vendor" || role === "worker") base.category = z.string().min(1, "Required");
  return z.object(base).passthrough().refine((d) => d.password === d.confirm_password, {
    path: ["confirm_password"], message: "Passwords do not match",
  });
}
