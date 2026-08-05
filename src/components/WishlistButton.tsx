import { Heart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

type WishlistKind = "hall" | "vendor" | "worker";

export function WishlistButton({
  kind, targetId, targetName, imageUrl, className,
}: {
  kind: WishlistKind;
  targetId: string;
  targetName: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ["c-wishlist-item", user?.id, kind, targetId],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("customer_wishlist").select("id").eq("user_id", user!.id).eq("kind", kind).eq("target_id", targetId).maybeSingle()).data,
  });

  const saved = !!existing;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Log in to save favourites", {
        action: { label: "Log in", onClick: () => { window.location.href = "/login"; } },
      });
      return;
    }
    if (saved && existing) {
      const { error } = await supabase.from("customer_wishlist").delete().eq("id", existing.id);
      if (error) return toast.error(error.message);
      toast.success("Removed from wishlist");
    } else {
      const { error } = await supabase.from("customer_wishlist").insert({
        user_id: user.id,
        kind,
        target_id: targetId,
        target_name: targetName,
        target_image_url: imageUrl ?? null,
      });
      if (error) return toast.error(error.message);
      toast.success("Saved to wishlist");
    }
    qc.invalidateQueries({ queryKey: ["c-wishlist"] });
    qc.invalidateQueries({ queryKey: ["c-wishlist-item", user.id, kind, targetId] });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      className={className ?? "grid h-8 w-8 place-items-center rounded-full bg-white/90 text-brand-navy shadow-sm hover:bg-white transition"}
    >
      <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
    </button>
  );
}
