"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { TIER_LABEL } from "@/lib/license";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { PrismMark } from "@/components/site/PrismMark";
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The Studio and Admin have their own full-screen chrome — the global
  // nav would collide with their fixed toolbars. Option out there.
  if (pathname === "/studio" || pathname.startsWith("/admin")) return null;

  const active = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
        <div
          className={cn(
            "theme-smooth mx-auto flex h-[3.6rem] max-w-[88rem] items-center gap-3 rounded-2xl border px-3 backdrop-blur-2xl transition-all duration-500 md:h-[3.9rem] md:rounded-full md:px-4",
            scrolled || open
              ? "border-line-strong/80 bg-bg/85 shadow-[0_24px_70px_-32px_rgba(0,0,0,0.8)]"
              : "border-line/70 bg-bg/45",
          )}
        >
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-full pr-2"
          >
            <PrismMark className="transition-transform duration-500 group-hover:rotate-6" />
            <span className="hidden sm:block">
              <span className="display block text-[14px] font-bold uppercase leading-none tracking-[0.14em]">
                EffectCraft
              </span>
              <span className="hud-label mt-1 block !text-[7px] !tracking-[0.32em]">
                Prism / 04
              </span>
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-1 lg:flex">
            {LINKS.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active(l.href) ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] tracking-[0.01em] transition-colors",
                  active(l.href)
                    ? "bg-tint text-ink"
                    : "text-ink-muted hover:bg-tint-soft hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "size-1 rounded-full transition-colors",
                    active(l.href)
                      ? "bg-bronze"
                      : "bg-ink-faint/40 group-hover:bg-bronze/60",
                  )}
                />
                {l.label}
                <span className="mono-num absolute right-2 top-1 hidden text-[6px] text-ink-faint/60 xl:block">
                  0{i + 1}
                </span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:gap-3 lg:ml-0">
            {hydrated && license ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-bronze/30 bg-bronze/[0.07] px-2.5 py-1 md:flex">
                <span className="size-1 rounded-full bg-bronze" />
                <span className="hud-label !text-[7px] !text-bronze-bright">
                  {TIER_LABEL[license.tier]}
                </span>
              </span>
            ) : null}

            <span className="hidden md:block">
              <ThemeToggle compact />
            </span>

            <span
              className="hidden h-5 w-px bg-line md:block"
              aria-hidden
            />

            <Link
              href="/studio"
              className="btn-primary group hidden !px-4 !py-2 !text-[12px] md:inline-flex"
            >
              Open Studio
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>

            <button
              className="grid size-9 place-items-center rounded-full border border-line-strong/70 text-ink-muted transition-colors hover:border-bronze/50 hover:text-ink lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* mobile — a full-spectrum overlay */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-bg/95 backdrop-blur-2xl" />
          <div className="grid-fine absolute inset-0 opacity-50" />
          <div
            aria-hidden
            className="aurora-blob -right-24 top-1/4 size-[26rem]"
            style={{
              background:
                "radial-gradient(circle, rgba(201,255,63,0.28), transparent 66%)",
            }}
          />
          <div
            aria-hidden
            className="aurora-blob -left-28 bottom-0 size-[30rem]"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,255,0.26), transparent 66%)",
            }}
          />

          <div className="relative flex h-full flex-col px-6 pb-10 pt-28">
            <nav className="flex flex-col">
              {LINKS.map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between border-b border-line py-5"
                >
                  <span className="flex items-baseline gap-4">
                    <span className="mono-num text-[9px] text-ink-faint">
                      0{i + 1}
                    </span>
                    <span
                      className={cn(
                        "display text-[2.4rem] font-bold uppercase leading-none tracking-[-0.03em] transition-colors",
                        active(l.href)
                          ? "text-bronze-bright"
                          : "text-ink group-hover:text-bronze-bright",
                      )}
                    >
                      {l.label}
                    </span>
                  </span>
                  <ArrowUpRight className="size-5 text-ink-faint transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-bronze" />
                </Link>
              ))}
            </nav>

            <div className="mt-auto">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="hud-label mb-2.5">Appearance</p>
                  <ThemeToggle />
                </div>
                {hydrated && license ? (
                  <span className="pill-badge !py-1.5">
                    {TIER_LABEL[license.tier]}
                  </span>
                ) : null}
              </div>

              <Link
                href="/studio"
                onClick={() => setOpen(false)}
                className="btn-primary group mt-6 w-full"
              >
                Open the Studio
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>

              <p className="hud-label mt-6 flex items-center gap-2">
                <span className="size-1 rounded-full bg-bronze" />
                EC/04 — Spectral Lab · Edge IAD1
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
