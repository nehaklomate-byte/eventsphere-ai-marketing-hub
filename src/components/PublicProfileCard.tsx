import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Link2, Copy, Share2, QrCode, ExternalLink, Loader2, Sparkles, Clock, Crown, Receipt, CheckCircle2, TrendingUp, Users, Search } from "lucide-react";
import {
  activatePublicProfile, purchaseSubscription, fetchPricing, priceForActivation,
  type ProfileRole, type ProfileVariant,
} from "@/lib/publicProfile";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

export function PublicProfileCard({
  role, entityId, variant, name, active, slug, verificationApproved,
  trialEndsAt, subscriptionActive, subscriptionExpiresAt,
  onActivated, onSubscribed,
}: {
  role: ProfileRole;
  entityId: string;
  variant: ProfileVariant;
  name: string;
  active: boolean;
  slug: string | null;
  verificationApproved: boolean;
  trialEndsAt?: string | null;
  subscriptionActive?: boolean;
  subscriptionExpiresAt?: string | null;
  onActivated: (slug: string) => void;
  onSubscribed?: (expiresAt: string) => void;
}) {
  const { user } = useSession();
  const [busy, setBusy] = useState<"activate" | "monthly" | "annual" | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);
  const isFreeWorker = role === "worker" && variant !== "agency";
  const url = slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}` : "";
  const roleWord = role === "venue" ? "venue" : role === "vendor" ? "business" : "profile";

  useEffect(() => {
    fetchPricing().then((p) => setPrice(priceForActivation(role, variant, p)));
  }, [role, variant]);

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
      toast.success(isFreeWorker ? "Public profile activated — free for individual workers!" : "Public profile activated!");
      if (paymentId) setLastReceiptId(paymentId);
      onActivated(newSlug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not activate");
    } finally { setBusy(null); }
  }

  async function handleSubscribe(plan: "monthly" | "annual") {
    if (role === "worker") return;
    setBusy(plan);
    try {
      const result = await purchaseSubscription({ role, entityId, name, plan, payerEmail: user?.email ?? undefined, payerPhone: user?.phone ?? undefined });
      toast.success("Subscription active — you're back to top-tier visibility!");
      if (result.paymentId) setLastReceiptId(result.paymentId);
      if (result.subscription_expires_at) onSubscribed?.(result.subscription_expires_at);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not subscribe");
    } finally { setBusy(null); }
  }

  function copyLink() { navigator.clipboard.writeText(url); toast.success("Link copied"); }
  function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(`Book me on EventOrbit Nova: ${url}`)}`, "_blank"); }

  const showsVisibility = role === "venue" || role === "vendor";
  const trialDaysLeft = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const subActive = subscriptionActive && (!subscriptionExpiresAt || new Date(subscriptionExpiresAt).getTime() > Date.now());
  const onTrial = trialDaysLeft !== null && trialDaysLeft > 0;
  const needsSubscription = showsVisibility && active && !onTrial && !subActive;

  if (!verificationApproved && !active) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Link2 className="h-4 w-4" /> Your Public Profile Link</div>
        <p className="mt-1 text-xs text-muted-foreground">Get verified to unlock your public profile link.</p>
      </div>
    );
  }

  if (active && slug) {
    return (
      <div className="space-y-3">
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

        {showsVisibility && onTrial && (
          <div className="rounded-2xl border border-brand-violet/30 bg-brand-violet/5 p-4 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-brand-violet shrink-0" />
            <span>{trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in your free trial</span>
          </div>
        )}

        {showsVisibility && subActive && !onTrial && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-2 text-sm">
            <Crown className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Pro plan active until {new Date(subscriptionExpiresAt!).toLocaleDateString("en-IN")}</span>
          </div>
        )}

        {needsSubscription && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400"><Crown className="h-4 w-4" /> Your free trial has ended</div>
            <p className="mt-1 text-xs text-muted-foreground">Subscribe to stay visible and keep getting bookings.</p>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Ranked higher in search</li>
              <li className="flex items-center gap-2"><Search className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Shown first to customers</li>
              <li className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Significantly more profile views</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => handleSubscribe("monthly")} disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold disabled:opacity-60">
                {busy === "monthly" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Monthly Plan
              </button>
              <button onClick={() => handleSubscribe("annual")} disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-60">
                {busy === "annual" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Annual Plan
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Link2 className="h-4 w-4 text-brand-violet" /> Your Public Profile Link</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Activate your public {roleWord} link to get direct bookings — verified and commission-protected.
      </p>
      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Your own shareable link</li>
        <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Bookings protected from external cancellation</li>
        {showsVisibility && (
          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Free trial included</li>
        )}
        <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> One-time activation fee</li>
      </ul>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-input px-4 py-3">
        <span className="text-sm text-muted-foreground">{isFreeWorker ? "Free for individual workers" : "One-time activation fee"}</span>
        <span className="text-lg font-bold text-foreground">{isFreeWorker ? "Free" : price !== null ? `₹${price}` : "…"}</span>
      </div>
      <button onClick={handleActivate} disabled={busy !== null}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
        {busy === "activate" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Activate Public Profile
      </button>
    </div>
  );
}
