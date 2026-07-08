import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["c-wishlist", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("customer_wishlist").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function remove(id: string) {
    const { error } = await supabase.from("customer_wishlist").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed from wishlist");
    qc.invalidateQueries({ queryKey: ["c-wishlist"] });
  }

  const kinds: Array<"hall"|"vendor"|"worker"> = ["hall","vendor","worker"];

  return (
    <PageShell title="Wishlist" subtitle="Your saved halls, vendors and workers.">
      {isLoading ? <LoadingRows /> : (data?.length ?? 0) === 0 ? (
        <EmptyState title="Nothing saved yet" description="Tap the heart icon on any hall or vendor to save it here." icon={Heart}
          action={<Link to="/marketplace" className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white"><Store className="h-4 w-4" /> Browse marketplace</Link>} />
      ) : (
        <div className="space-y-8">
          {kinds.map((k) => {
            const items = data!.filter((w) => w.kind === k);
            if (!items.length) return null;
            return (
              <section key={k}>
                <h2 className="font-display text-lg font-semibold capitalize mb-3">Favourite {k}s</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((w) => (
                    <div key={w.id} className="group rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-violet">{w.kind}</div>
                          <div className="mt-1 font-semibold truncate">{w.target_name}</div>
                        </div>
                        <button onClick={() => remove(w.id)} aria-label="Remove" className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
