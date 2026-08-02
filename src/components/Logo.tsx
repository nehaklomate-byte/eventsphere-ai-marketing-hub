import { Link } from "@tanstack/react-router";
import logoPrimary from "@/assets/logo-primary.png.asset.json";
import logoWhite from "@/assets/logo-white.png.asset.json";

export function Logo({ variant = "primary", className = "h-9" }: { variant?: "primary" | "white" | "mark"; className?: string }) {
  const src = variant === "white" ? logoWhite.url : logoPrimary.url;
  return (
    <Link to="/" className="inline-flex items-center gap-2 shrink-0" aria-label="EventOrbit AI home">
      <img src={src} alt="EventOrbit AI" className={`${className} w-auto object-contain`} />
    </Link>
  );
}
