// Path: src/components/PayoutBanner.tsx
import { useState } from "react";
import { Wallet, Loader2 } from "lucide-react";

/**
 * Shown once (worker/vendor/venue owner dashboard, after account
 * approval) when payout_upi_id is still empty. Nothing to do with
 * signup — this is asked for only once the person is a real,
 * approved user who's about to start earning.
 */
export function PayoutBanner({ onSave, saving }: { onSave: (upi: string) => Promise<void>; saving: boolean }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = value.trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(trimmed)) {
      setErr("Enter a valid UPI ID, e.g. yourname@okhdfcbank");
      return;
    }
    setErr(null);
    await onSave(trimmed);
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Add your UPI ID to get paid</div>
          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
            You're approved! Add your UPI ID so payments for completed work can be sent to you.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="yourname@okhdfcbank"
              className="min-w-[220px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={saving || !value.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </button>
          </div>
          {err && <div className="mt-1.5 text-xs font-medium text-rose-600">{err}</div>}
        </div>
      </div>
    </div>
  );
}
