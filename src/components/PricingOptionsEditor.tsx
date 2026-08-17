import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

/** Combinable a-la-carte add-ons (name + price, optionally per-guest) —
 * the customer ticks whichever ones they want on the public profile and
 * the total is calculated for them, instead of them typing a guessed
 * "offer amount". Used by both vendor and worker profiles (see
 * vendor.$id.tsx / worker.$id.tsx for the customer-facing side) — same
 * `pricing_options` jsonb column shape on both tables, so one shared
 * editor covers both instead of two near-identical copies. */
export type PricingOption = { id: string; name: string; price: number; per_guest: boolean };

export function PricingOptionsEditor({ options, onChange }: { options: PricingOption[]; onChange: (opts: PricingOption[]) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [perGuest, setPerGuest] = useState(false);

  function add() {
    const p = Number(price);
    if (!name.trim() || !p) { toast.error("Add a name and a price first."); return; }
    onChange([...options, { id: crypto.randomUUID(), name: name.trim(), price: p, per_guest: perGuest }]);
    setName(""); setPrice(""); setPerGuest(false);
  }

  return (
    <div className="mt-3 space-y-2">
      {options.length > 0 && (
        <div className="space-y-1.5">
          {options.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
              <span>{o.name}</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">₹{o.price.toLocaleString("en-IN")}{o.per_guest ? " / guest" : ""}</span>
                <button type="button" onClick={() => onChange(options.filter((x) => x.id !== o.id))} className="text-muted-foreground hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Extra hour"
          className="min-w-[160px] flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand-violet" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price ₹"
          className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-brand-violet" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={perGuest} onChange={(e) => setPerGuest(e.target.checked)} /> Per guest
        </label>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-full border border-dashed border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  );
}
