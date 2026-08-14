/**
 * Shown at the top of every /terms, /privacy, /refund-policy and
 * /partner-terms page while the platform is in early access. EventOrbit
 * Nova is registered under the Maharashtra Shops and Establishments
 * Act, 2017; registration particulars are available on request from
 * hello@eventorbitnova.com and are intentionally not published in full
 * on this public page. These four documents are still an early-stage
 * draft — not yet reviewed by a lawyer, not a final negotiated
 * agreement. Remove this component's usage once a lawyer has finalized
 * all four pages.
 */
export function BetaNotice() {
  return (
    <div className="mx-auto max-w-3xl px-5 md:px-8">
      <div className="mt-8 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 px-5 py-4 text-sm text-amber-900 dark:text-amber-300">
        <p className="font-semibold">You're using an early-access version of EventOrbit Nova.</p>
        <p className="mt-1">
          The document below is still an early-stage draft — it has not been reviewed by a lawyer and is not a
          final, fully negotiated agreement. It is shared here only so users know, in plain terms, what to
          expect while the platform is in early access. Please don't rely on it for legal certainty, and note
          that some features described on our Features page are still being built.
        </p>
      </div>
    </div>
  );
}
