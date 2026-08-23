import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Trash2, Edit3, PenSquare, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageShell, EmptyState, LoadingRows } from "./-ui";
import { AttachmentUpload, AttachmentGallery, type Attachment } from "@/components/AttachmentUpload";
import { EmojiPicker } from "@/components/EmojiPicker";

export const Route = createFileRoute("/_authenticated/customer/reviews")({ component: ReviewsPage });

type PendingItem = { kind: "hall" | "vendor" | "worker"; target_id: string; target_name: string };
// customer_reviews.photos (migration 20260823110000) isn't in the
// generated Database types yet — cast query results through this
// local type instead of fighting `select("*")` inference everywhere.
type ReviewRow = { id: string; kind: "hall" | "vendor" | "worker"; target_id: string; target_name: string; rating: number; comment: string | null; photos: Attachment[]; created_at: string };

function ReviewsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [writing, setWriting] = useState<PendingItem | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newPhotos, setNewPhotos] = useState<Attachment[]>([]);
  const [editPhotos, setEditPhotos] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["c-reviews", user?.id],
    enabled: !!user?.id,
    queryFn: async () => ((await supabase.from("customer_reviews").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? []) as unknown as ReviewRow[],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["c-bookings-for-review", user?.id],
    enabled: !!user?.id,
    // A review can only be written once the event itself is marked
    // completed AND the payment actually cleared through the platform
    // (payment_status = 'paid'). Earlier this also allowed status
    // 'confirmed', which let a customer review before the event even
    // happened, and it never checked payment_status at all — so a
    // booking whose payment never went through the platform could
    // still be reviewed. Both gaps are closed here.
    queryFn: async () =>
      (await supabase.from("customer_bookings").select("kind,target_id,target_name,status,payment_status")
        .eq("user_id", user!.id).eq("status", "completed").eq("payment_status", "paid")).data ?? [],
  });

  const pending: PendingItem[] = (() => {
    if (!bookings || !data) return [];
    const reviewedKeys = new Set(data.map((r) => `${r.kind}:${r.target_id}`));
    const seen = new Set<string>();
    const items: PendingItem[] = [];
    for (const b of bookings) {
      if (!b.target_id) continue;
      const key = `${b.kind}:${b.target_id}`;
      if (reviewedKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      items.push({ kind: b.kind, target_id: b.target_id, target_name: b.target_name });
    }
    return items;
  })();

  async function saveEdit(id: string) {
    const { error } = await supabase.from("customer_reviews").update({ comment, rating, photos: editPhotos } as never).eq("id", id);
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

  async function submitNew() {
    if (!writing || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("customer_reviews").insert({
      user_id: user.id,
      kind: writing.kind,
      target_id: writing.target_id,
      target_name: writing.target_name,
      rating: newRating,
      comment: newComment.trim() || null,
      photos: newPhotos,
    } as never);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Review submitted");
    setWriting(null);
    setNewComment("");
    setNewRating(5);
    setNewPhotos([]);
    qc.invalidateQueries({ queryKey: ["c-reviews"] });
    qc.invalidateQueries({ queryKey: ["c-bookings-for-review"] });
  }

  const loading = isLoading || bookingsLoading;
  const nothing = !loading && (data?.length ?? 0) === 0 && pending.length === 0;

  return (
    <PageShell title="Reviews" subtitle="Your reviews for halls, vendors and workers.">
      {loading ? <LoadingRows /> : nothing ? (
        <EmptyState title="No reviews yet" description="After an event, you can review the hall, vendors and workers you booked." icon={Star} />
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold mb-3">Pending your review</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pending.map((p) => (
                  <div key={`${p.kind}:${p.target_id}`} className="rounded-2xl border border-dashed border-brand-violet/40 bg-accent/30 p-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-violet">{p.kind}</div>
                      <div className="mt-1 font-semibold">{p.target_name}</div>
                    </div>
                    <button onClick={() => { setWriting(p); setNewRating(5); setNewComment(""); setNewPhotos([]); }}
                      className="inline-flex items-center gap-1.5 rounded-full btn-brand btn-brand-hover px-3 py-1.5 text-xs font-semibold text-white shrink-0">
                      <PenSquare className="h-3.5 w-3.5" /> Write review
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(data?.length ?? 0) > 0 && (
            <section>
              {pending.length > 0 && <h2 className="font-display text-lg font-semibold mb-3">Your reviews</h2>}
              <div className="grid gap-4 md:grid-cols-2">
                {data!.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-violet">{r.kind}</div>
                        <div className="mt-1 font-semibold">{r.target_name}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(r.id); setComment(r.comment ?? ""); setRating(r.rating); setEditPhotos(r.photos ?? []); }} aria-label="Edit" className="rounded-lg p-1.5 hover:bg-accent"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => remove(r.id)} aria-label="Delete" className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {editing === r.id ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-1">{[1,2,3,4,5].map((n) => (
                          <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}><Star className={`h-5 w-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} /></button>
                        ))}</div>
                        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-background p-2 text-sm" />
                        <div className="flex items-center gap-2">
                          <EmojiPicker compact onSelect={(e) => setComment((c) => c + e)} />
                          <AttachmentUpload pathPrefix={`reviews/${user?.id}`} value={editPhotos} onChange={setEditPhotos} photosOnly maxFiles={6} compact />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(r.id)} className="rounded-lg btn-brand btn-brand-hover px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                          <button onClick={() => setEditing(null)} className="rounded-lg border border-input px-3 py-1.5 text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 text-amber-400">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></div>
                        {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                        {r.photos?.length > 0 && <AttachmentGallery attachments={r.photos as Attachment[]} />}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {writing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setWriting(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-violet">{writing.kind}</div>
                <h3 className="mt-1 font-display text-lg font-semibold">{writing.target_name}</h3>
              </div>
              <button onClick={() => setWriting(null)} aria-label="Close" className="rounded-lg p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 flex gap-1">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setNewRating(n)} aria-label={`${n} star`}>
                  <Star className={`h-6 w-6 ${n <= newRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={4} placeholder="Share details about your experience…"
              className="mt-3 w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-brand-violet" />
            <div className="mt-2 flex items-center gap-2">
              <EmojiPicker compact onSelect={(e) => setNewComment((c) => c + e)} />
            </div>
            <div className="mt-3">
              <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Photos (optional)</div>
              <AttachmentUpload pathPrefix={`reviews/${user?.id}`} value={newPhotos} onChange={setNewPhotos} photosOnly maxFiles={6} />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={submitNew} disabled={submitting} className="rounded-lg btn-brand btn-brand-hover px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
                {submitting ? "Submitting…" : "Submit review"}
              </button>
              <button onClick={() => setWriting(null)} className="rounded-lg border border-input px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
