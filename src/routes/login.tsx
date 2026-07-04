import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — EventSphere AI" },
      { name: "description", content: "Log in to your EventSphere AI account." },
      { property: "og:title", content: "Log in — EventSphere AI" },
      { property: "og:description", content: "Log in to EventSphere AI." },
      { property: "og:url", content: "/login" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="hidden lg:block bg-gradient-brand relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <Link to="/"><Logo variant="white" className="h-9" /></Link>
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight">Plan • Manage • Connect</h2>
            <p className="mt-3 max-w-sm text-white/85">The operating system for the world's events.</p>
          </div>
          <p className="text-xs text-white/70">© {new Date().getFullYear()} EventSphere AI</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Link to="/"><Logo className="h-9" /></Link></div>
          <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log in to your EventSphere account.</p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-8 space-y-4">
            <Field label="Email"><input type="email" className="input" placeholder="you@company.com" /></Field>
            <Field label="Password"><input type="password" className="input" placeholder="••••••••" /></Field>
            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-muted-foreground"><input type="checkbox" /> Remember me</label>
              <a href="#" className="font-semibold text-brand-violet">Forgot password?</a>
            </div>
            <button className="w-full rounded-full btn-brand btn-brand-hover px-5 py-3 text-sm font-semibold">Log in</button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            New here? <Link to="/register" className="font-semibold text-brand-violet">Create an account</Link>
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
