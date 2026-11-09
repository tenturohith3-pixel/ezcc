"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { TIER_LABEL } from "@/lib/license";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/studio", label: "Studio" },
  { href: "/plugins", label: "Plugins" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
];

export function Nav() {
  const pathname = usePathname();
  const { license, hydrated } = useLicense();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // The Studio and Admin have their own full-screen chrome — the global
  // nav would collide with their fixed toolbars. Option out there.
  if (pathname === "/studio" || pathname.startsWith("/admin")) return null;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 theme-smooth",
          scrolled || open
            ? "bg-bg/85 backdrop-blur-xl border-b border-line"
            : "bg-transparent border-b border-transparent",
        )}
      >
        <div className="mx-auto max-w-[88rem] px-6 md:px-10 h-[4.5rem] flex items-center justify-between gap-6">
          <Link href="/" className="group flex items-baseline gap-2.5 min-w-0">
            <span className="display text-[1.55rem] leading-none tracking-[0.01em]">
              EffectCraft
            </span>
            <span className="size-1.5 rounded-full bg-bronze translate-y-[-2px] group-hover:bg-bronze-bright transition-colors" />
            <span className="hidden lg:block mono-label !text-[8px] !tracking-[0.34em] !text-ink-faint translate-y-[-1px]">
              Color Lab
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
            {LINKS.map((l, i) => {
              const active =
                pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "group relative text-[13px] tracking-[0.01em] transition-colors py-2",
                    active ? "text-ink" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <span className="mono-num text-[8px] text-ink-faint/70 mr-1.5 align-[2px]">
                    0{i + 1}
                  </span>
                  {l.label}
                  <span
                    className={cn(
                      "absolute inset-x-0 -bottom-0.5 h-px bg-bronze/70 origin-left transition-transform duration-500",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {hydrated && license ? (
              <span className="mono-label !text-[8px] text-bronze-bright">
                {TIER_LABEL[license.tier]}
              </span>
            ) : null}
            <ThemeToggle compact />
            <span className="h-4 w-px bg-line" aria-hidden />
            <Link
              href="/studio"
              className="group inline-flex items-center gap-1.5 text-[13px] text-ink hover:text-bronze-bright transition-colors"
            >
              Open Studio
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <button
            className="md:hidden p-2 -mr-2 text-ink-muted hover:text-ink"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* mobile — a quiet full-screen card */}
      {open ? (
        <div className="md:hidden fixed inset-0 z-40 bg-bg pt-24 px-8 flex flex-col">
          <nav className="flex flex-col">
            {LINKS.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-baseline justify-between py-5 border-b border-line"
              >
                <span className="flex items-baseline gap-4">
                  <span className="mono-num text-[9px] text-ink-faint">
                    0{i + 1}
                  </span>
                  <span className="display text-3xl text-ink group-hover:text-bronze-bright transition-colors">
                    {l.label}
                  </span>
                </span>
                <ArrowUpRight className="size-4 text-ink-faint" />
              </Link>
            ))}
          </nav>
          <div className="mt-auto pb-10 flex items-center justify-between">
            <div>
              <p className="mono-label !text-[8px] mb-2">APPEARANCE</p>
              <ThemeToggle />
            </div>
            {hydrated && license ? (
              <span className="pill-badge !py-1.5">{TIER_LABEL[license.tier]}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
