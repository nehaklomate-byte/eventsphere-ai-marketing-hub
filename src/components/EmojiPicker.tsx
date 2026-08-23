import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

// Curated rather than a full unicode table — common reactions +
// event/wedding-planning-relevant picks (this is an event-booking
// platform), grouped loosely so the grid doesn't feel random.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀", "😄", "😊", "🙂", "😍", "🥳", "😅", "😂", "🤔", "😮", "😢", "🙏"] },
  { label: "Gestures", emojis: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "💪", "🤞"] },
  { label: "Events", emojis: ["🎉", "🎊", "🎂", "🎈", "💐", "💍", "🥂", "🍾", "📸", "🎶", "🕺", "💃"] },
  { label: "Hearts", emojis: ["❤️", "💕", "✨", "⭐", "🔥", "💯"] },
  { label: "Objects", emojis: ["📅", "📍", "⏰", "💰", "✅", "❌", "⚠️", "📎"] },
];

/**
 * Small emoji-insert popover. `onSelect` gets called with the emoji
 * character — the caller decides how to merge it into their text
 * (append, or insert at cursor if they're tracking one).
 */
export function EmojiPicker({ onSelect, compact = false }: { onSelect: (emoji: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Add emoji"
        className={compact ? "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-input text-muted-foreground hover:bg-accent" : "inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent"}>
        <Smile className="h-4 w-4" /> {!compact && "Emoji"}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-2xl border border-border bg-card p-3 shadow-elegant">
          {EMOJI_GROUPS.map((g) => (
            <div key={g.label} className="mb-2 last:mb-0">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</div>
              <div className="flex flex-wrap gap-1">
                {g.emojis.map((e) => (
                  <button key={e} type="button" onClick={() => { onSelect(e); setOpen(false); }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-accent">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
