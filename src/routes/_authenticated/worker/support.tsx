import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Mail, MessageCircle } from "lucide-react";
export const Route = createFileRoute("/_authenticated/worker/support")({ component: () => (
  <div className="space-y-6 max-w-3xl">
    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Support</h1>
    <div className="grid gap-4 sm:grid-cols-2">
      <a href="mailto:support@eventsphere.ai" className="rounded-2xl border border-border bg-card p-6 hover:bg-accent">
        <Mail className="h-5 w-5 text-brand-violet" />
        <div className="mt-3 font-semibold">Email support</div>
        <div className="text-xs text-muted-foreground mt-1">support@eventsphere.ai · replies within 24h</div>
      </a>
      <Link to="/contact" className="rounded-2xl border border-border bg-card p-6 hover:bg-accent block">
        <MessageCircle className="h-5 w-5 text-brand-violet" />
        <div className="mt-3 font-semibold">Contact team</div>
        <div className="text-xs text-muted-foreground mt-1">Reach the operations team via the contact form.</div>
      </Link>
    </div>
    <div className="rounded-2xl border border-border bg-card p-6">
      <LifeBuoy className="h-5 w-5 text-brand-violet" />
      <div className="mt-3 font-semibold">Help & FAQs</div>
      <div className="text-sm text-muted-foreground mt-1">The knowledge base is being built for launch. Meanwhile, our team is one message away.</div>
    </div>
  </div>
) });
