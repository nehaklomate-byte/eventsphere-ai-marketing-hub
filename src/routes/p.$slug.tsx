import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { fetchPublicProfileBySlug } from "@/lib/publicProfile";

// This route intentionally renders nothing itself. It resolves the paid
// shareable slug to the real entity, then redirects straight to the
// actual marketplace detail page (/hall/$id, /vendor/$id, /worker/$id)
// — the exact same page everyone sees from the marketplace, so it can
// never visually drift out of sync: any section added to those pages
// automatically shows here too, with zero extra maintenance.
// `?ref=<slug>` is passed through so the booking/enquiry this visitor
// makes is tagged booking_source = "public_profile_link" for tracking,
// without changing what they see.
export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const result = await fetchPublicProfileBySlug(params.slug);
    if (!result) throw notFound();

    const path = result.role === "venue" ? "/hall/$id" : result.role === "vendor" ? "/vendor/$id" : "/worker/$id";
    throw redirect({
      to: path,
      params: { id: result.entity.id as string },
      search: { ref: params.slug } as never,
      replace: true,
    });
  },
});
