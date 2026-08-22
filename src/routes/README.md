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
