# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.
# EventOrbit Nova fixes — files to drop into your repo

Copy these over the matching paths in your project (same relative paths), then run
both new migrations on Supabase (SQL editor, or your migration pipeline) after your
existing ones, in this order:

1. `supabase/migrations/20260822100000_hall_booking_decline_reason.sql`
2. `supabase/migrations/20260822110000_fix_halls_blocked_dates_column.sql`  ← run this one, it fixes the "column blocked_dates does not exist" error

Then update these code files:
- `src/lib/venue.ts`
- `src/routes/_authenticated/venue/bookings.tsx`
- `src/routes/_authenticated/customer/bookings.tsx`

## Bug 2 — "Price & confirm" failing (FOUND & FIXED)
Root cause: `public.halls` never actually had a `blocked_dates` column.
`20260819140000_hall_double_booking_guard.sql` added a trigger that reads/writes
`halls.blocked_dates` on every hall-booking confirm, and its own comment
incorrectly claimed the column already existed from an earlier migration — that
earlier migration actually added `blocked_dates` to `public.workers`, not
`public.halls` (vendors got their own copy separately). So every hall booking
confirm since that migration was applied has failed with
`column "blocked_dates" does not exist`.

Fix: `20260822110000_fix_halls_blocked_dates_column.sql` adds the missing column
(same shape as workers/vendors — jsonb array of date strings, default `[]`).
Run it and "Price & confirm" should work.

## Bug/feature 1 — Decline reason
1. Added `decline_reason` column to `customer_bookings` + a trigger that notifies
   the customer in-app with the reason when a hall booking is declined/cancelled.
2. Venue owner's "Decline" and "Cancel booking" buttons now open a modal requiring
   a reason before it saves.
3. Customer's Bookings page now shows that reason under the status (also surfaced
   the existing `rejection_reason` for vendor/worker task rejections, which existed
   in the DB already but was never shown to customers).

## Note
The `expire_unpaid_hall_advances` cron job (from `20260822090000`) also sets
bookings to `cancelled` but never sets `decline_reason` — it already sends its own
"advance payment pending → cancelled" message, so that's intentional.

# Vendor/Worker marketplace spec — what's done vs. what's not

I read the full 26-section spec. Honest assessment: most of the structural pieces it
asks for **already exist** in this codebase (someone/something has been actively
building this out) — packages, add-ons, server-authoritative pricing, verification
badges, privacy separation. The one clear, real gap was **§3/§15/§21: the
customer's own words weren't being captured** — only an auto-generated summary of
what they clicked. That's what's fixed here. Everything else is listed below as an
honest backlog, not implemented.

## What was already there (spec §4–11, §16, §20 — mostly done)
- `vendor_packages` table — vendors already define named packages with their own
  price, not one fixed price per category.
- `pricing_options` (add-ons) on both vendors and workers, with `per_guest` support.
- Booking price is **server-authoritative** — a DB trigger
  (`tg_recompute_vendor_task_amount` / `tg_recompute_worker_task_amount`) re-derives
  `payment_amount` from the actual package/options server-side; the client-sent
  amount is never trusted. This already satisfies §16 ("profile price ≠ final
  price") and most of §20 (snapshot can't drift from a later profile edit).
- Category badges, ratings, portfolio, verified badge, service areas — all present
  on the public vendor/worker pages.

## What was fixed in this change (closes §3, §15 step 3, §21)
Added a **`customer_requirements`** column to `vendor_tasks` and `worker_tasks`,
separate from the existing `description` (which stays as the auto-generated
"Package: X (₹Y)\nAdd-on: Z" summary). Now:
- Both booking forms (`vendor.$id.tsx`, `worker.$id.tsx`) have a
  "Tell them exactly what you need" textarea.
- It's saved distinctly, not merged into the summary text.
- It shows to the vendor/worker on their Jobs page in its own highlighted block
  ("Customer asked for: ...") so it can't get lost inside the selection summary.

### Files here
- `supabase/migrations/20260823110000_task_customer_requirements.sql` — run this
- `src/lib/vendor.ts`, `src/lib/worker.ts` — type updates
- `src/routes/vendor.$id.tsx`, `src/routes/worker.$id.tsx` — booking forms
- `src/routes/_authenticated/vendor/jobs.tsx`, `.../worker/jobs.tsx` — display

## Privacy audit (spec §12, §22)
Checked `vendor.$id.tsx`, `worker.$id.tsx`, `hall.$id.tsx` for GST/PAN/UPI/emergency-
contact/ID-proof leaks on the public pages — none found. Already correct.

## Genuinely NOT done — real backlog, not a small add-on
These are multi-day-to-multi-week efforts each, not something to bolt on quietly:

1. **Category-specific structured fields** (§5–8): decoration style + specific
   elements (stage/mandap/entrance...), photography type/drone/album checkboxes,
   DJ equipment/genre fields, catering menu-builder with sections and items. Right
   now customers express all of this through the one free-text box just added —
   functional, but not the guided, checkbox-driven UI the spec describes per
   category. This is the single biggest remaining chunk of work.
2. **Reference image / document attachments on booking** (§3, §14) — not added.
3. **Event bundling — one event, multiple providers, combined estimate** (§17–19):
   venue + in-house vs external vendor linking, "Find Caterers" fallback when a
   venue doesn't offer catering, one combined quote across venue+vendor+workers.
   Not present at all currently.
4. **Worker accept/reject/counter-offer with clarification requests** (§14) —
   accept/reject exists; structured "request clarification" or counter-quote does
   not.
5. **Reviews restricted to verified bookings only** — not verified either way in
   this pass; worth checking separately.

If you want, tell me which of these to tackle next and I'll scope + build that one
properly rather than spreading thin across all five.
