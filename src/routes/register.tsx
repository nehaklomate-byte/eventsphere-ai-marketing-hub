import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — EventSphere AI" },
      { name: "description", content: "Join early access to EventSphere AI." },
      { property: "og:title", content: "Create your account — EventSphere AI" },
      { property: "og:description", content: "Join EventSphere AI early access." },
      { property: "og:url", content: "/register" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/register" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const perks = ["Free during private beta", "Direct access to the product team", "Named credit in our research reports", "Priority onboarding at launch"];
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="hidden lg:block bg-gradient-brand relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <Link to="/"><Logo variant="white" className="h-9" /></Link>
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight">Join Early Access</h2>
            <ul className="mt-6 space-y-2.5">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-2 text-white/90"><CheckCircle2 className="h-4 w-4 mt-0.5" /> {p}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/70">© {new Date().getFullYear()} EventSphere AI</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Link to="/"><Logo className="h-9" /></Link></div>
          <h1 className="font-display text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Get an invite to our private beta.</p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-8 space-y-4">
            <Field label="Full name"><input className="input" placeholder="Priya Sharma" /></Field>
            <Field label="Work email"><input type="email" className="input" placeholder="you@company.com" /></Field>
            <Field label="Organization"><input className="input" placeholder="Meridian Halls" /></Field>
            <Field label="Password"><input type="password" className="input" placeholder="Create a password" /></Field>
            <button className="w-full rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">Request access</button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-semibold text-brand-violet">Log in</Link>
          </p>
        </div>
      </div>
      <style>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--border); background: var(--card); padding: 10px 14px; font-size: 14px; outline: none; }
        .input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 25%, transparent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
