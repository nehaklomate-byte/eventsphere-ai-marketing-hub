import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Link2, Copy, Share2, QrCode, ExternalLink, Loader2, Sparkles, Crown, Receipt, CheckCircle2, EyeOff, Gift } from "lucide-react";
import {
  activatePublicProfile, purchaseSubscription, fetchPricing, priceForActivation, priceForSubscription, hasPaidSubscription,
  type ProfileRole, type ProfileVariant, type SubscriptionPlan,
} from "@/lib/publicProfile";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

export function PublicProfileCard({
  role, entityId, variant, name, active, slug, verificationApproved,
  subscriptionActive, subscriptionExpiresAt,
  onActivated, onSubscribed,
}: {
  role: ProfileRole;
  entityId: string;
  variant: ProfileVariant;
  name: string;
  active: boolean;
  slug: string | null;
  verificationApproved: boolean;
  subscriptionActive?: boolean;
  subscriptionExpiresAt?: string | null;
  onActivated: (slug: string) => void;
  onSubscribed?: (expiresAt: string) => void;
}) {
  const { user } = useSession();
  const [busy, setBusy] = useState<"activate" | SubscriptionPlan | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [planPrices, setPlanPrices] = useState<Record<SubscriptionPlan, number> | null>(null);
  const [everSubscribed, setEverSubscribed] = useState<boolean | null>(null);
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);
  const isFreeWorker = role === "worker" && price === 0;
  const url = slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}` : "";
  const roleWord = role === "venue" ? "venue" : role === "vendor" ? "business" : "profile";

  useEffect(() => {
    fetchPricing().then((p) => {
      setPrice(priceForActivation(role, variant, p));
      setPlanPrices({
        monthly: priceForSubscription(role, "monthly", p),
        "6month": priceForSubscription(role, "6month", p),
        annual: priceForSubscription(role, "annual", p),
      });
    });
  }, [role, variant]);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    hasPaidSubscription(role, entityId).then((v) => { if (!cancelled) setEverSubscribed(v); }).catch(() => { if (!cancelled) setEverSubscribed(false); });
    return () => { cancelled = true; };
  }, [role, entityId]);

  // The receipt link must survive a page refresh/relogin, not just live
  // in memory right after paying — so whenever this card is showing an
  // active profile, look up the most recent PAID payment row for this
  // entity and fall back to it if we don't already have one from this
  // session's activate/subscribe call.
  useEffect(() => {
    if (!active || !entityId || lastReceiptId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("public_profile_payments" as never)
        .select("id" as never)
        .eq("role" as never, role as never)
        .eq("entity_id" as never, entityId as never)
        .eq("status" as never, "paid" as never)
        .order("created_at" as never, { ascending: false })
        .limit(1)
        .maybeSingle();
      const paymentId = (data as unknown as { id: string } | null)?.id;
      if (!cancelled && paymentId) setLastReceiptId(paymentId);
    })();
    return () => { cancelled = true; };
  }, [active, entityId, role, lastReceiptId]);

  async function handleActivate() {
    setBusy("activate");
    try {
      const { slug: newSlug, paymentId } = await activatePublicProfile({
        role, entityId, variant, name,
        payerEmail: user?.email ?? undefined,
        payerPhone: user?.phone ?? undefined,
      });
      toast.success("Public profile activated!");
      if (paymentId) setLastReceiptId(paymentId);
      onActivated(newSlug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not activate");
    } finally { setBusy(null); }
  }

  async function handleSubscribe(plan: SubscriptionPlan) {
    setBusy(plan);
    try {
      const result = await purchaseSubscription({ role, entityId, name, plan, payerEmail: user?.email ?? undefined, payerPhone: user?.phone ?? undefined });
      toast.success("Subscription active — your profile is now visible on the marketplace!");
      setEverSubscribed(true);
      if (result.paymentId) setLastReceiptId(result.paymentId);
      if (result.subscription_expires_at) onSubscribed?.(result.subscription_expires_at);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not subscribe");
    } finally { setBusy(null); }
  }

  function copyLink() { navigator.clipboard.writeText(url); toast.success("Link copied"); }
  function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(`Book me on EventOrbit Nova: ${url}`)}`, "_blank"); }

  const subActive = !!subscriptionActive && !!subscriptionExpiresAt && new Date(subscriptionExpiresAt).getTime() > Date.now();
  const PLAN_LABEL: Record<SubscriptionPlan, string> = { monthly: "Monthly", "6month": "6 Months", annual: "Annual" };

  if (!verificationApproved && !active) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Crown className="h-4 w-4" /> Subscription &amp; Public Profile Link</div>
        <p className="mt-1 text-xs text-muted-foreground">Get verified to unlock your marketplace subscription and public profile link.</p>
      </div>
    );
  }

  const planButton = (plan: SubscriptionPlan, primary: boolean) => (
    <button key={plan} onClick={() => handleSubscribe(plan)} disabled={busy !== null || !planPrices}
      className={primary
        ? "inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold disabled:opacity-60"
        : "inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-60"}>
      {busy === plan && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {PLAN_LABEL[plan]} · {planPrices ? `₹${planPrices[plan]}` : "…"}
    </button>
  );

  const subscriptionCard = subActive ? (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Crown className="h-4 w-4" /> Subscription active</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Your profile is visible on the marketplace until {new Date(subscriptionExpiresAt!).toLocaleDateString("en-IN")}.
        Renewing early adds the new plan on top of the remaining time.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["monthly", "6month", "annual"] as SubscriptionPlan[]).map((p) => planButton(p, false))}
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400"><EyeOff className="h-4 w-4" /> Your profile is hidden from the marketplace</div>
      <p className="mt-1 text-xs text-muted-foreground">
        {subscriptionExpiresAt ? `Your subscription ended on ${new Date(subscriptionExpiresAt).toLocaleDateString("en-IN")}. ` : ""}
        Customers can see your profile on the marketplace only while your subscription is active.
      </p>
      {everSubscribed === null ? (
        <div className="mt-3 text-xs text-muted-foreground">Loading plans…</div>
      ) : !everSubscribed ? (
        <>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-input px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-foreground"><Gift className="h-4 w-4 text-brand-violet shrink-0" /> Starter plan — 2 months (1 month free + 1 month paid)</span>
            <span className="text-lg font-bold text-foreground">{planPrices ? `₹${planPrices.monthly}` : "…"}</span>
          </div>
          <button onClick={() => handleSubscribe("monthly")} disabled={busy !== null || !planPrices}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
            {busy === "monthly" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Start Subscription
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">After the starter plan you can renew Monthly, 6 Months or Annual.</p>
        </>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {(["monthly", "6month", "annual"] as SubscriptionPlan[]).map((p, i) => planButton(p, i === 0))}
        </div>
      )}
    </div>
  );

  if (active && slug) {
    return (
      <div className="space-y-3">
        {subscriptionCard}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" /> Public Profile Active
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Share this link to get direct bookings — verified and protected.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{url}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"><Copy className="h-3.5 w-3.5" /> Copy Link</button>
            <button onClick={shareWhatsApp} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"><Share2 className="h-3.5 w-3.5" /> Share on WhatsApp</button>
            <a href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"><QrCode className="h-3.5 w-3.5" /> QR Code</a>
            <a href={`/p/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"><ExternalLink className="h-3.5 w-3.5" /> View Public Profile</a>
            {lastReceiptId && (
              <Link to="/receipt/$type/$id" params={{ type: "profile", id: lastReceiptId }} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent">
                <Receipt className="h-3.5 w-3.5" /> View Receipt
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subscriptionCard}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Link2 className="h-4 w-4 text-brand-violet" /> Your Public Profile Link</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Activate your public {roleWord} link to get direct bookings — verified and commission-protected.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Your own shareable link</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> "Official Booking Profile" badge on the marketplace</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Bookings protected from external cancellation</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> One-time activation fee</li>
        </ul>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-input px-4 py-3">
          <span className="text-sm text-muted-foreground">One-time activation fee</span>
          <span className="text-lg font-bold text-foreground">{isFreeWorker ? "Free" : price !== null ? `₹${price}` : "…"}</span>
        </div>
        <button onClick={handleActivate} disabled={busy !== null}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
          {busy === "activate" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Activate Public Profile
        </button>
      </div>
    </div>
  );
}
