import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  User, ShieldCheck, Lock, Eye, Bell, Loader2, Save, Upload,
  LogOut, Trash2, AlertTriangle, X, Copy, ShieldOff, KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import {
  fetchMyAccountProfile, updateAccountBasics, updatePreferences, setNotificationPref,
  changePassword, logoutAllDevices, requestAccountDeletion, cancelAccountDeletion, fetchPendingDeletionRequest,
  NOTIFICATION_EVENT_LABEL,
  type AccountProfile, type Preferences, type NotificationChannel, type NotificationEvent,
} from "@/lib/settings";
import { listFactors, enrollTotp, verifyEnrollment, unenroll } from "@/lib/mfa";

const TABS = ["basic", "security", "privacy", "notifications"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { basic: "Basic Info", security: "Login & Security", privacy: "Privacy", notifications: "Notifications" };
const TAB_ICON: Record<Tab, typeof User> = { basic: User, security: Lock, privacy: Eye, notifications: Bell };

/**
 * Drop this into any role's settings.tsx:
 *   <AccountSettingsSection />
 * It's fully self-contained (own data fetching/saving) and identical for
 * every role — role-specific settings render separately, above or below it.
 */
export function AccountSettingsSection() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("basic");
  const { data: profile, isLoading } = useQuery({
    queryKey: ["account-profile", user?.id], queryFn: () => fetchMyAccountProfile(user!.id), enabled: !!user?.id,
  });

  if (isLoading || !profile) {
    return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;
  }

  function refresh() { qc.invalidateQueries({ queryKey: ["account-profile", user?.id] }); }

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 overflow-x-auto rounded-full border border-border bg-card p-1 text-sm">
        {TABS.map((t) => {
          const Icon = TAB_ICON[t];
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 font-semibold transition ${tab === t ? "bg-gradient-brand text-white" : "text-muted-foreground hover:bg-accent"}`}>
              <Icon className="h-3.5 w-3.5" /> {TAB_LABEL[t]}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {tab === "basic" && <BasicInfoTab profile={profile} userId={user!.id} onSaved={refresh} />}
        {tab === "security" && <SecurityTab userId={user!.id} />}
        {tab === "privacy" && <PrivacyTab profile={profile} userId={user!.id} onSaved={refresh} />}
        {tab === "notifications" && <NotificationsTab profile={profile} userId={user!.id} onSaved={refresh} />}
      </div>

      <style>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--border); background: var(--background); padding: 10px 14px; font-size: 14px; outline: none; }
        .input:focus { border-color: var(--brand-violet); box-shadow: 0 0 0 3px color-mix(in oklab, var(--brand-violet) 22%, transparent); }
        .input:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

/* ---------------- Basic Info ---------------- */
function BasicInfoTab({ profile, userId, onSaved }: { profile: AccountProfile; userId: string; onSaved: () => void }) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setForm(profile), [profile.id]);

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const path = `${userId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((f) => ({ ...f, avatar_url: data.publicUrl }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  }

  async function save() {
    setSaving(true);
    try {
      await updateAccountBasics(userId, {
        full_name: form.full_name, avatar_url: form.avatar_url, phone: form.phone, alt_phone: form.alt_phone,
        username: form.username || null, date_of_birth: form.date_of_birth || null, gender: form.gender || null,
      });
      toast.success("Saved"); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {form.avatar_url ? <img src={form.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />
          : <div className="grid h-16 w-16 place-items-center rounded-full bg-accent text-muted-foreground"><User className="h-6 w-6" /></div>}
        <label className="inline-flex items-center gap-2 rounded-full border border-dashed border-input px-3.5 py-2 text-xs font-medium cursor-pointer hover:bg-accent">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {uploading ? "Uploading…" : "Change photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <F label="Full name"><input className="input" value={form.full_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></F>
        <F label="Username"><input className="input" value={form.username ?? ""} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="Optional" /></F>
        <F label="Email"><input className="input" value={form.email ?? ""} disabled title="Change email from Login & Security" /></F>
        <F label="Mobile number"><input className="input" value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></F>
        <F label="Alternate mobile"><input className="input" value={form.alt_phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, alt_phone: e.target.value }))} /></F>
        <F label="Date of birth"><input type="date" className="input" value={form.date_of_birth ?? ""} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))} /></F>
        <F label="Gender">
          <select className="input" value={form.gender ?? ""} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
            <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select>
        </F>
      </div>
      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-semibold disabled:opacity-70">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
      </button>
    </div>
  );
}

/* ---------------- Login & Security ---------------- */
function SecurityTab({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: pendingDeletion, refetch } = useQuery({
    queryKey: ["deletion-request", userId], queryFn: () => fetchPendingDeletionRequest(userId),
  });

  async function savePassword() {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSavingPw(true);
    try { await changePassword(newPassword); toast.success("Password updated"); setNewPassword(""); setConfirmPassword(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to update password"); }
    finally { setSavingPw(false); }
  }

  async function handleLogoutAll() {
    setLoggingOutAll(true);
    try { await logoutAllDevices(); toast.success("Signed out everywhere"); navigate({ to: "/login" }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to sign out"); }
    finally { setLoggingOutAll(false); }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-sm mb-3">Change password</h3>
        <div className="grid gap-3 md:grid-cols-2 max-w-lg">
          <input type="password" placeholder="New password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <input type="password" placeholder="Confirm new password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button onClick={savePassword} disabled={savingPw || !newPassword} className="mt-3 inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50">
          {savingPw && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Update password
        </button>
      </div>

      <div className="border-t border-border pt-6">
        <TwoFactorSection userId={userId} />
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-semibold text-sm mb-1">Sign out everywhere</h3>
        <p className="text-xs text-muted-foreground mb-3">Immediately signs your account out on every device and browser, including this one.</p>
        <button onClick={handleLogoutAll} disabled={loggingOutAll} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50">
          {loggingOutAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />} Logout from all devices
        </button>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-semibold text-sm mb-1 text-rose-600">Delete account</h3>
        {pendingDeletion ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm">
            <p>Deletion requested on {new Date(pendingDeletion.requested_at).toLocaleDateString()}. Our team will process this request.</p>
            <button onClick={async () => { await cancelAccountDeletion(userId); toast.success("Deletion request cancelled"); refetch(); }}
              className="mt-2 text-xs font-semibold text-brand-violet hover:underline">Cancel this request</button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">This sends a request to our team — your account isn't deleted instantly.</p>
            <button onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/10">
              <Trash2 className="h-3.5 w-3.5" /> Request account deletion
            </button>
          </>
        )}
      </div>

      {deleteOpen && <DeleteAccountDialog userId={userId} onClose={() => setDeleteOpen(false)} onDone={() => { setDeleteOpen(false); refetch(); }} />}
    </div>
  );
}

/* ---------------- Two-Factor Authentication ---------------- */
function TwoFactorSection({ userId }: { userId: string }) {
  const { data: factors, isLoading, refetch } = useQuery({
    queryKey: ["mfa-factors", userId], queryFn: listFactors,
  });
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [turningOff, setTurningOff] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const verified = (factors ?? []).find((f) => f.status === "verified");

  async function startEnroll() {
    setEnrolling(true);
    setVerifyError(null);
    try {
      const data = await enrollTotp("Authenticator app");
      setEnrollData({ factorId: data.factorId, qrCode: data.qrCode, secret: data.secret });
      setCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start enrollment");
    } finally {
      setEnrolling(false);
    }
  }

  async function cancelEnroll() {
    if (enrollData) {
      try { await unenroll(enrollData.factorId); } catch { /* ignore */ }
    }
    setEnrollData(null);
    setCode("");
    setVerifyError(null);
  }

  async function verify() {
    if (!enrollData) return;
    if (code.trim().length !== 6) { setVerifyError("Enter the 6-digit code from your authenticator app."); return; }
    setVerifying(true);
    setVerifyError(null);
    try {
      await verifyEnrollment(enrollData.factorId, code.trim());
      toast.success("Two-factor authentication enabled");
      setEnrollData(null);
      setCode("");
      refetch();
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Invalid code, please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function turnOff(factorId: string) {
    setTurningOff(factorId);
    try {
      await unenroll(factorId);
      toast.success("Two-factor authentication turned off");
      setConfirmOff(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to turn off two-factor authentication");
    } finally {
      setTurningOff(null);
    }
  }

  function copySecret() {
    if (!enrollData) return;
    navigator.clipboard.writeText(enrollData.secret);
    toast.success("Secret copied");
  }

  return (
    <div>
      <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Two-factor authentication</h3>
      <p className="text-xs text-muted-foreground mb-3">Add an extra verification step at login using an authenticator app (TOTP).</p>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : verified ? (
        <div className="rounded-xl border border-border bg-background p-4 max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">Enabled</span>
              <p className="mt-2 text-sm font-medium">{verified.friendlyName || "Authenticator app"}</p>
              <p className="text-xs text-muted-foreground">Added on {new Date(verified.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => setConfirmOff(true)} className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10">
              <ShieldOff className="h-3.5 w-3.5" /> Turn off
            </button>
          </div>
          {confirmOff && (
            <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm">
              <p>Are you sure you want to turn off two-factor authentication?</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => turnOff(verified.id)} disabled={turningOff === verified.id}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-70">
                  {turningOff === verified.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Yes, turn off
                </button>
                <button onClick={() => setConfirmOff(false)} className="rounded-full border border-input px-3.5 py-1.5 text-xs font-semibold hover:bg-accent">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ) : enrollData ? (
        <div className="rounded-xl border border-border bg-background p-4 max-w-lg space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">1. Scan this QR code with your authenticator app</p>
            <img src={enrollData.qrCode} alt="TOTP QR code" className="h-40 w-40 rounded-lg border border-border bg-white p-2" />
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Or enter this code manually</p>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-accent px-3 py-1.5 text-xs break-all">{enrollData.secret}</code>
              <button onClick={copySecret} className="rounded-lg p-1.5 hover:bg-accent" aria-label="Copy secret"><Copy className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">2. Enter the 6-digit code</p>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric" placeholder="000000" className="input max-w-[10rem] tracking-widest text-center" />
            {verifyError && <p className="mt-1.5 text-xs font-medium text-destructive">{verifyError}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={verify} disabled={verifying} className="inline-flex items-center gap-2 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold disabled:opacity-70">
              {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Verify & activate
            </button>
            <button onClick={cancelEnroll} className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <span className="inline-block mb-3 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Disabled</span>
          <div>
            <button onClick={startEnroll} disabled={enrolling} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-50">
              {enrolling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} Enable two-factor authentication
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteAccountDialog({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try { await requestAccountDeletion(userId, reason); toast.success("Deletion requested"); onDone(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to submit request"); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-rose-600"><AlertTriangle className="h-5 w-5" /> Request account deletion</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">This can't be undone once processed. Tell us why you're leaving (optional) — it helps us improve.</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm" />
        <button onClick={submit} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit request
        </button>
      </div>
    </div>
  );
}

/* ---------------- Privacy ---------------- */
const PRIVACY_LABEL: Record<keyof Preferences["privacy"], string> = {
  public_profile: "Public profile", show_mobile: "Show mobile number", show_email: "Show email address",
  allow_direct_chat: "Allow direct chat", allow_direct_calls: "Allow direct calls",
  search_visible: "Show up in search", hide_last_active: "Hide last active status",
};
function PrivacyTab({ profile, userId, onSaved }: { profile: AccountProfile; userId: string; onSaved: () => void }) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  async function toggle(key: keyof Preferences["privacy"], value: boolean) {
    setBusyKey(key);
    try { await updatePreferences(userId, profile.preferences, { privacy: { ...profile.preferences.privacy, [key]: value } }); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    finally { setBusyKey(null); }
  }
  return (
    <div className="divide-y divide-border">
      {(Object.keys(PRIVACY_LABEL) as (keyof Preferences["privacy"])[]).map((key) => (
        <ToggleRow key={key} label={PRIVACY_LABEL[key]} checked={profile.preferences.privacy[key]} busy={busyKey === key} onChange={(v) => toggle(key, v)} />
      ))}
    </div>
  );
}

/* ---------------- Notifications ---------------- */
function NotificationsTab({ profile, userId, onSaved }: { profile: AccountProfile; userId: string; onSaved: () => void }) {
  const [channel, setChannel] = useState<NotificationChannel>("push");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  async function toggle(event: NotificationEvent, value: boolean) {
    setBusyKey(event);
    try { await setNotificationPref(userId, profile.preferences, channel, event, value); onSaved(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    finally { setBusyKey(null); }
  }
  return (
    <div>
      <div className="inline-flex rounded-full border border-border p-1 text-xs mb-4">
        {(["push", "email", "sms"] as NotificationChannel[]).map((c) => (
          <button key={c} onClick={() => setChannel(c)} className={`rounded-full px-3.5 py-1.5 font-semibold capitalize transition ${channel === c ? "bg-gradient-brand text-white" : "text-muted-foreground"}`}>{c}</button>
        ))}
      </div>
      <div className="divide-y divide-border">
        {(Object.keys(NOTIFICATION_EVENT_LABEL) as NotificationEvent[]).map((event) => (
          <ToggleRow key={event} label={NOTIFICATION_EVENT_LABEL[event]} checked={profile.preferences.notify[channel][event]} busy={busyKey === event} onChange={(v) => toggle(event, v)} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- shared bits ---------------- */
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}
function ToggleRow({ label, checked, busy, onChange }: { label: string; checked: boolean; busy?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm">{label}</span>
      <button onClick={() => onChange(!checked)} disabled={busy}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-brand-violet" : "bg-muted"} disabled:opacity-50`}>
        {busy ? <Loader2 className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
          : <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />}
      </button>
    </div>
  );
}
