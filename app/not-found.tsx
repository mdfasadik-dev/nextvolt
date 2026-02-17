import Link from "next/link";
import { Home, LayoutGrid, LifeBuoy, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-orange-400/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-4xl items-center px-5 py-12">
        <section className="w-full rounded-2xl border bg-card/80 p-7 shadow-xl backdrop-blur sm:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" />
            Error 404
          </div>

          <p className="text-7xl font-black leading-none tracking-tight text-primary/95 sm:text-8xl">404</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Page not found</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            The page you requested does not exist, may have moved, or the URL may be incorrect.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                Go to Home
              </Link>
            </Button>
          </div>

          <div className="mt-8 rounded-xl border bg-background/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LifeBuoy className="h-4 w-4 text-primary" />
              Need help?
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Check the URL for typos, or return to a known page using the buttons above.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

