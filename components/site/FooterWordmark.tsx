"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Oversized wordmark that rises out of the footer on scroll. */
export function FooterWordmark() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      if (
        pathname.startsWith("/studio") ||
        pathname.startsWith("/admin") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      if (!wrapRef.current) return;
      gsap.from(wrapRef.current, {
        yPercent: 46,
        opacity: 0.12,
        ease: "none",
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });
    },
    { dependencies: [pathname] },
  );

  return (
    <div ref={wrapRef} aria-hidden className="select-none px-4 pb-2 overflow-hidden">
      <p className="display spectrum-text text-center text-[15vw] font-bold leading-[0.9] tracking-[-0.055em] whitespace-nowrap opacity-90">
        EFFECTCRAFT
      </p>
    </div>
  );
}
