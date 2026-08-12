import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CookieConsent } from "@/components/CookieConsent";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { isNativeAppShell } from "@/lib/platform";

function ComingSoonPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-brand px-4 text-center text-white">
      <img src="/favicon.png" alt="EventOrbit Nova" className="h-16 w-16 rounded-2xl shadow-lg" />
      <h1 className="mt-6 font-display text-3xl font-bold sm:text-5xl">EventOrbit Nova</h1>
      <p className="mt-4 max-w-md text-base text-white/85 sm:text-lg">
        We're putting the finishing touches on something exciting. Our new booking platform for venues, vendors and workers is coming soon.
      </p>
      <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold backdrop-blur-sm">
        Launching soon — stay tuned
      </div>
    </div>
  );
}

// Site-wide "Coming Soon" gate. While true, EVERY route (including
// login/admin) renders this page instead — there is no bypass. Flip
// back to false to restore normal access.
const COMING_SOON = false;

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-brand">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-medium"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-full btn-brand btn-brand-hover px-5 py-2.5 text-sm font-medium"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "EventOrbit Nova — Plan • Manage • Connect" },
      { name: "description", content: "One intelligent cloud platform to plan, manage and execute weddings, corporate events, festivals and more. Venues, vendors, workers and participants — unified." },
      { name: "author", content: "EventOrbit Nova" },
      { property: "og:title", content: "EventOrbit Nova — Plan • Manage • Connect" },
      { property: "og:description", content: "One intelligent cloud platform to plan, manage and execute every event." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "EventOrbit Nova" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@EventOrbitNova" },
      { name: "theme-color", content: "#0B1B5A" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "EventOrbit Nova" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [showComingSoon, setShowComingSoon] = useState(COMING_SOON);
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Splash safety-net: ALWAYS runs, no matter what else renders below,
    // so the native app can never get stuck on the logo forever.
    import("@capacitor/splash-screen").then(({ SplashScreen }) => {
      setTimeout(() => SplashScreen.hide(), 2200);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Client-only check (SSR always renders the ComingSoon state first
    // so server and client match on first paint — no hydration
    // mismatch). If this is the native app, flip to the real app
    // right after mount.
    if (COMING_SOON && isNativeAppShell()) setShowComingSoon(false);
  }, []);

  useEffect(() => {
    import("@/lib/settings").then(({ applyTheme, getStoredTheme }) => applyTheme(getStoredTheme()));
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      if (!mounted) return;
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
      (RootComponent as unknown as { _sub?: { subscription: { unsubscribe: () => void } } })._sub = sub;
    });
    return () => {
      mounted = false;
      const s = (RootComponent as unknown as { _sub?: { subscription: { unsubscribe: () => void } } })._sub;
      s?.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  if (showComingSoon) return <ComingSoonPage />;

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <CookieConsent />
      <InstallAppPrompt />
    </QueryClientProvider>
  );
}
