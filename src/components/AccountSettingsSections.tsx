// Path: src/components/AccountSettingsSections.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Bell, ShieldAlert } from "lucide-react";

export function PasswordSection() {
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
    <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <div className="text-sm font-semibold">Change password</div>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (min 8)"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
      <button onClick={changePassword} disabled={busy}
        className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
      </button>
    </div>
  );
}

type NotifyPrefs = { notify_new_task: boolean; notify_status_updates: boolean };

export function NotificationPrefsSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: ["notify-prefs", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("notify_new_task, notify_status_updates").eq("id", userId).maybeSingle();
      if (error) throw error;
      return (data ?? { notify_new_task: true, notify_status_updates: true }) as NotifyPrefs;
    },
    enabled: !!userId,
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<NotifyPrefs>) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notify-prefs", userId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save"),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4" /> Notifications</div>
      <Toggle
        label="New task assigned"
        description="Get notified the moment someone assigns you a job."
        checked={prefs?.notify_new_task ?? true}
        onChange={(v) => update.mutate({ notify_new_task: v })}
      />
      <Toggle
        label="Status updates"
        description="Get notified when a task you're involved in changes status (accepted, completed, etc.)."
        checked={prefs?.notify_status_updates ?? true}
        onChange={(v) => update.mutate({ notify_status_updates: v })}
      />
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-9 shrink-0 accent-brand-violet" />
    </label>
  );
}

export function DangerZoneSection({ userId }: { userId: string }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("account_deactivation_requests").insert({ user_id: userId, reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Request sent — our team will reach out before deactivating anything."); setOpen(false); setReason(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't send request"),
  });

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><ShieldAlert className="h-4 w-4" /> Danger zone</div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-500/10">
          Request account deactivation
        </button>
      ) : (
        <div className="space-y-2">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why are you leaving? (optional)"
            className="w-full rounded-xl border border-input bg-background p-3 text-sm" />
          <div className="flex gap-2">
            <button onClick={() => request.mutate()} disabled={request.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              {request.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm request
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-accent">Cancel</button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">This sends a request to our team — your account isn't deactivated automatically, so nothing is lost by mistake.</p>
    </div>
  );
}
