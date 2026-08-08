import { Link } from "@tanstack/react-router";

export function Logo({ variant = "primary", className = "h-9" }: { variant?: "primary" | "white" | "mark"; className?: string }) {
  const src = variant === "white" ? "/logo-mark-white.png" : "/logo-mark.png";
  return (
    <Link to="/" className="inline-flex items-center gap-2 shrink-0" aria-label="EventOrbit Nova home">
      <img src={src} alt="EventOrbit Nova" className={`${className} w-auto object-contain`} />
    </Link>
  );
}
