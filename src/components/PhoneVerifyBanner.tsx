// Path: src/components/PhoneVerifyBanner.tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Smartphone } from "lucide-react";
import type { User } from "@supabase/supabase-js";

/**
 * Verifies the person's mobile number via OTP, using Supabase Auth's
 * built-in phone provider — NOT a custom-built OTP system. This means:
 *   - No OTP codes are generated/stored/expired by our own code.
 *   - Rate limiting, resend cooldowns etc. are handled by Supabase.
 *   - Requires an SMS provider to be configured in Supabase Dashboard
 *     → Authentication → Providers → Phone (Twilio / MessageBird /
 *     Vonage / TextLocal). Without that, updateUser({ phone }) below
 *     will fail with a clear "phone provider not configured" error.
 *
 * Shown wherever `!user.phone_confirmed_at` — the same "banner only
 * if missing" pattern as PayoutBanner.
 */
function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (input.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

export function PhoneVerifyBanner({ user }: { user: User }) {
  const [phase, setPhase] = useState<"enter" | "otp">("enter");
  const [phone, setPhone] = useState((user.user_metadata?.phone as string | undefined) ?? "");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function sendOtp() {
    const e164 = toE164(phone);
    if (!e164) return toast.error("Enter a valid 10-digit mobile number");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ phone: e164 });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSentTo(e164);
    setPhase("otp");
    toast.success("OTP sent — check your SMS");
  }

  async function verifyOtp() {
    if (otp.trim().length < 4) return toast.error("Enter the OTP you received");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: sentTo, token: otp.trim(), type: "phone_change" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Mobile number verified!");
    await supabase.auth.refreshSession(); // pulls the updated phone_confirmed_at into the session
  }

  return (
    <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">Verify your mobile number</div>
          <p className="mt-1 text-xs text-blue-800/80 dark:text-blue-300/80">
            {phase === "enter" ? "We'll text you a one-time code to confirm this number." : `Enter the code sent to ${sentTo}.`}
          </p>
          {phase === "enter" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number"
                className="min-w-[200px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <button onClick={sendOtp} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Send OTP
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" inputMode="numeric"
                className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <button onClick={verifyOtp} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Verify
              </button>
              <button onClick={() => setPhase("enter")} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-accent">
                Change number
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
