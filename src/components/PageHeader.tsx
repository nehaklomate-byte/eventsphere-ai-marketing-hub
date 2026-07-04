import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero border-b border-border/60">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-20 md:py-28">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-violet">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl">
          {title}
        </h1>
        {description && <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
