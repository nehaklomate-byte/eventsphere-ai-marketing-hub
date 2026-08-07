/**
 * Shown at the top of every /terms, /privacy, /refund-policy and
 * /partner-terms page during closed beta — i.e. while the operating
 * company is not yet registered and these documents are still drafts
 * (see the [DATE]/[CIN NUMBER]/[ADDRESS] placeholders further down each
 * page). Remove this component's usage once: (1) the company is
 * registered, (2) a lawyer has finalized all four legal pages, and
 * (3) the placeholders are replaced with real values.
 */
export function BetaNotice() {
  return (
    <div className="mx-auto max-w-3xl px-5 md:px-8">
      <div className="mt-8 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 px-5 py-4 text-sm text-amber-900 dark:text-amber-300">
        <p className="font-semibold">You're using an early/closed-beta version of EventOrbit AI.</p>
        <p className="mt-1">
          The operating company is not yet registered and the document below is an unfinished draft — it has not
          been reviewed by a lawyer and is not a final, enforceable agreement. It is shared here only so early
          users know, in plain terms, what to expect. Please don't rely on it for legal certainty, and treat all
          bookings, payments and payouts made during this beta as part of a trial with people you already know
          — not a public commercial launch.
        </p>
      </div>
    </div>
  );
}
