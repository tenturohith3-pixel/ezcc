"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getCurrentTier } from "@/lib/keys";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasKey(getCurrentTier() !== null);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Desktop Nav — exact from reference */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 shadow-lg flex justify-between items-center px-16 py-2 max-w-screen-2xl mx-auto hidden md:flex">
        <Link href="/" className="font-bold text-[32px] leading-[40px] text-[#7dd3fc] tracking-tighter hover:opacity-80 transition-opacity" style={{ fontFamily: "'Inter', sans-serif" }}>
          ColorGrade
        </Link>

        <div className="flex gap-6 items-center text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
          <a href="#features" className="text-[#7dd3fc] font-bold border-b-2 border-[#7dd3fc] pb-1 scale-95 active:scale-90 transition-transform">
            Features
          </a>
          <a href="#gallery" className="text-[#a0b4c4] font-medium hover:text-[#7dd3fc] transition-colors duration-300 scale-95 active:scale-90 transition-transform">
            Showcase
          </a>
          <a href="#pricing" className="text-[#a0b4c4] font-medium hover:text-[#7dd3fc] transition-colors duration-300 scale-95 active:scale-90 transition-transform">
            Pricing
          </a>
        </div>

        <div className="flex gap-6 items-center text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
          <a href="#" className="text-[#a0b4c4] font-medium hover:text-[#7dd3fc] transition-colors duration-300 scale-95 active:scale-90 transition-transform">
            Sign In
          </a>
          <Link href="/tool" className="iridescent-btn px-6 py-2 rounded-full font-medium scale-95 active:scale-90 transition-transform" style={{ fontFamily: "'Inter', sans-serif" }}>
            {hasKey ? "Open Editor" : "Launch Editor"}
          </Link>
        </div>
      </nav>

      {/* Mobile Nav — exact from reference */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 shadow-lg flex justify-between items-center px-5 py-2 md:hidden">
        <Link href="/" className="font-bold text-[28px] leading-[36px] text-[#7dd3fc] tracking-tighter" style={{ fontFamily: "'Inter', sans-serif" }}>
          ColorGrade
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-[#7dd3fc] p-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${mounted && mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0" style={{ background: "rgba(10, 14, 26, 0.95)", backdropFilter: "blur(40px)" }} onClick={closeMobile} />
        <div className={`relative z-10 flex flex-col justify-center items-center h-full px-8 transition-all duration-300 ${mounted && mobileOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
          <nav className="flex flex-col items-center gap-8">
            {["Features", "Showcase", "Pricing"].map((label, i) => (
              <a key={label} href={`#${label.toLowerCase()}`} onClick={closeMobile} className="text-2xl text-[#a0b4c4] hover:text-[#e0e8f0] transition-colors duration-300 font-medium" style={{ transitionDelay: mounted && mobileOpen ? `${i * 60 + 80}ms` : "0ms" }}>
                {label}
              </a>
            ))}
            <Link href="/tool" onClick={closeMobile} className={`iridescent-btn px-10 py-4 rounded-full font-bold text-sm transition-all duration-300 ${mounted && mobileOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`} style={{ transitionDelay: mounted && mobileOpen ? "280ms" : "0ms" }}>
              {hasKey ? "Open Editor" : "Launch Editor"}
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
