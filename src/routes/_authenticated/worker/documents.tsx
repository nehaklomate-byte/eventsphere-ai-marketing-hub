import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { EmptyState } from "./index";
export const Route = createFileRoute("/_authenticated/worker/documents")({ component: () => (
  <div className="space-y-6">
    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Documents</h1>
    <div className="rounded-2xl border border-border bg-card p-8">
      <EmptyState icon={FileText} title="Manage documents from Profile → Portfolio & Verification" body="A consolidated document vault is coming soon." />
    </div>
  </div>
) });
