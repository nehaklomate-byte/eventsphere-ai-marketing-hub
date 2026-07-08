import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Trash2, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";

export const Route = createFileRoute("/_authenticated/customer/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);

  const { data, isLoading } = useQuery({
    queryKey: ["c-reviews", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("customer_reviews").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function saveEdit(id: string) {
    const { error } = await supabase.from("customer_reviews").update({ comment, rating }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Review updated"); setEditing(null);
    qc.invalidateQueries({ queryKey: ["c-reviews"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("customer_reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Review deleted"); qc.invalidateQueries({ queryKey: ["c-reviews"] });
  }

  return (
    <PageShell title="Reviews" subtitle="Your reviews for halls, vendors and workers.">
      {isLoading ? <LoadingRows /> : (data?.length ?? 0) === 0 ? (
        <EmptyState title="No reviews yet" description="After an event, you can review the hall, vendors and workers you booked." icon={Star} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-violet">{r.kind}</div>
                  <div className="mt-1 font-semibold">{r.target_name}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(r.id); setComment(r.comment ?? ""); setRating(r.rating); }} aria-label="Edit" className="rounded-lg p-1.5 hover:bg-accent"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => remove(r.id)} aria-label="Delete" className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {editing === r.id ? (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">{[1,2,3,4,5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}><Star className={`h-5 w-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} /></button>
                  ))}</div>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-background p-2 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(r.id)} className="rounded-lg btn-brand btn-brand-hover px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                    <button onClick={() => setEditing(null)} className="rounded-lg border border-input px-3 py-1.5 text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-2 text-amber-400">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></div>
                  {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
