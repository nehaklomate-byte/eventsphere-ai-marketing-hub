import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/worker/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useSession();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function changePassword() {
    if (pw.length < 8) return toast.error("Minimum 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated"); setPw("");
  }
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold">Account</div>
          <div className="text-xs text-muted-foreground">{user?.email}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="text-sm font-semibold">Change password</div>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8)"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={changePassword} disabled={busy}
          className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </button>
      </div>
    </div>
  );
}
