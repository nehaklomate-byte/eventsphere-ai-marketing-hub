import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Link2, Copy, Share2, QrCode, ExternalLink, Loader2, Sparkles, Clock, Crown, Receipt, CheckCircle2, TrendingUp, Users, Search } from "lucide-react";
import {
  activatePublicProfile, purchaseSubscription, fetchPricing, priceForActivation,
  type ProfileRole, type ProfileVariant,
} from "@/lib/publicProfile";
import { useSession } from "@/lib/session";

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
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Link2 className="h-4 w-4" /> Public Booking Profile</div>
        <p className="mt-1 text-xs text-muted-foreground">Complete document verification first — once approved, you can activate your shareable public link here.</p>
      </div>
    );
  }

  if (active && slug) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" /> Public Booking Profile — Active
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Share this link anywhere — WhatsApp, Instagram, visiting cards, QR code.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{url}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"><Copy className="h-3.5 w-3.5" /> Copy link</button>
            <button onClick={shareWhatsApp} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"><Share2 className="h-3.5 w-3.5" /> Share on WhatsApp</button>
            <a href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"><QrCode className="h-3.5 w-3.5" /> QR code</a>
            <a href={`/p/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent"><ExternalLink className="h-3.5 w-3.5" /> View public profile</a>
            {lastReceiptId && (
              <Link to="/receipt/$type/$id" params={{ type: "profile", id: lastReceiptId }} className="inline-flex items-center gap-1.5 rounded-full border border-input px-3.5 py-2 text-xs font-semibold hover:bg-accent">
                <Receipt className="h-3.5 w-3.5" /> View receipt
              </Link>
            )}
          </div>
        </div>

        {showsVisibility && onTrial && (
          <div className="rounded-2xl border border-brand-violet/30 bg-brand-violet/5 p-4 flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-brand-violet shrink-0" />
            <span><strong>{trialDaysLeft} days</strong> left of free top-tier search visibility.</span>
          </div>
        )}

        {showsVisibility && subActive && !onTrial && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-2 text-sm">
            <Crown className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Subscription active until {new Date(subscriptionExpiresAt!).toLocaleDateString("en-IN")}.</span>
          </div>
        )}

        {needsSubscription && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400"><Crown className="h-4 w-4" /> Your free 6-month visibility trial has ended</div>
            <p className="mt-1 text-xs text-muted-foreground">Your listing itself always stays free and visible — a Pro subscription just moves you back to the top of search results and marketplace ranking, where most bookings come from.</p>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Ranked above non-subscribed listings in every search</li>
              <li className="flex items-center gap-2"><Search className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Shown first for your category and city</li>
              <li className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-amber-600 shrink-0" /> More profile views → more enquiries → more bookings</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => handleSubscribe("monthly")} disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-xs font-semibold disabled:opacity-60">
                {busy === "monthly" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Monthly plan
              </button>
              <button onClick={() => handleSubscribe("annual")} disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-60">
                {busy === "annual" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Annual plan (better value)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Link2 className="h-4 w-4 text-brand-violet" /> Public Booking Profile</div>
      <p className="mt-1 text-xs text-muted-foreground">
        A personal booking page for your {roleWord} — put it on WhatsApp, Instagram bio, or your visiting card so customers can check availability and book you directly.
      </p>
      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Your own shareable link — eventorbitnova.com/p/yourname</li>
        <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Customers book straight through it — payment, confirmation and reviews stay protected</li>
        {showsVisibility && (
          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> 6 months of free top-tier search visibility — shown first when someone searches your category</li>
        )}
        <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> One-time fee — no recurring charge just to keep the link active</li>
      </ul>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-input px-4 py-3">
        <span className="text-sm text-muted-foreground">{isFreeWorker ? "Individual workers" : "One-time activation fee"}</span>
        <span className="text-lg font-bold text-foreground">{isFreeWorker ? "FREE" : price !== null ? `₹${price}` : "…"}</span>
      </div>
      <button onClick={handleActivate} disabled={busy !== null}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
        {busy === "activate" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Activate Public Profile
      </button>
    </div>
  );
}
