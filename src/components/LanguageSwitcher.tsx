import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Change language"
        className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent">
        <Languages className="h-3.5 w-3.5" /> {current.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[140px] rounded-xl border border-border bg-card p-1 shadow-elegant z-50">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button key={l.code} onClick={() => { setLanguage(l.code as LanguageCode); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent">
              {l.label} {l.code === current.code && <Check className="h-3.5 w-3.5 text-brand-violet" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
