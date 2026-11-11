"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Hairline scroll-progress meter — fixed to the very top of the page. */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      if (
        !barRef.current ||
        pathname.startsWith("/studio") ||
        pathname.startsWith("/admin")
      )
        return;
      gsap.to(barRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.35 },
      });
    },
    { dependencies: [pathname] },
  );

  return (
    <div
      ref={barRef}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[65] h-[2px] origin-left scale-x-0 bg-[linear-gradient(90deg,#c9ff3f,#3ce8ff,#8b5cff,#ff4d9d)]"
    />
  );
}
