"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentTier } from "@/lib/keys";

export default function Hero() {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(getCurrentTier() !== null);
  }, []);

  return (
    <header className="relative pt-32 pb-20 md:pt-56 md:pb-40 px-5 md:px-16 max-w-screen-2xl mx-auto overflow-hidden min-h-screen flex items-center">
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#0e4d6e] rounded-full mix-blend-screen blur-[120px] opacity-30 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-[#88b4cc] rounded-full mix-blend-screen blur-[150px] opacity-20" />
      </div>

      <div className="relative z-10 grid md:grid-cols-2 gap-8 md:gap-16 items-center w-full">
        {/* Left — Headline */}
        <div className="flex flex-col gap-5 md:gap-6">
          <div className="inline-flex items-center gap-2 text-[#7dd3fc] text-xs tracking-[0.08em] uppercase font-medium bg-[#1a2438]/50 border border-[#2a3a48] px-4 py-1.5 rounded-full w-fit" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span className="w-2 h-2 rounded-full bg-[#7dd3fc] animate-pulse shadow-[0_0_8px_rgba(125,211,252,0.8)]" />
            Vol. 01 — Cinematic Color
          </div>

          <h1 className="text-4xl md:text-[64px] leading-[1.1] tracking-[-0.04em] font-extrabold text-gradient" style={{ fontFamily: "'Inter', sans-serif" }}>
            Make Every<br />Frame Cinematic
          </h1>

          <p className="text-base md:text-[18px] leading-relaxed md:leading-[32px] text-[#e0e8f0] max-w-xl opacity-90 font-light" style={{ fontFamily: "'Inter', sans-serif" }}>
            Professional color grading for the modern creator. LUT presets, 3-way color wheels, and AI-powered corrections — all in your browser.
          </p>

          <div className="flex flex-wrap gap-4 md:gap-6 pt-4 md:pt-6">
            <Link href="/tool" className="iridescent-btn font-bold px-6 md:px-8 py-3 md:py-3.5 rounded-full text-sm flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              {hasKey ? "Open Editor" : "Start Free Trial"}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <a href="#gallery" className="glass-panel px-6 md:px-8 py-3 md:py-3.5 rounded-full text-sm text-[#e0e8f0] flex items-center gap-2 hover:bg-[#1a2438] transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
              View Gallery
            </a>
          </div>

          <div className="flex items-center gap-4 mt-6 md:mt-10 pt-6 md:pt-8 border-t border-white/10">
            <div className="flex -space-x-3">
              {["U1", "U2", "+"].map((label, i) => (
                <div key={i} className={`w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#202c42] border-2 border-[#0f1524] flex items-center justify-center text-xs font-medium ${i === 2 ? "text-[#7dd3fc]" : "text-[#e0e8f0]"}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                  {label}
                </div>
              ))}
            </div>
            <div className="text-xs text-[#a0b4c4]" style={{ fontFamily: "'Inter', sans-serif" }}>
              <span className="text-[#e0e8f0] font-semibold text-sm">2,400+ creators</span><br />
              No credit card required
            </div>
          </div>
        </div>

        {/* Right — Preview Panel (hidden on mobile) */}
        <div className="relative h-[300px] md:h-[600px] w-full rounded-3xl overflow-hidden glass-panel group hidden md:block border border-white/20">
          <div className="absolute bottom-6 right-6 glass-panel p-5 rounded-2xl flex gap-6 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="text-center">
              <div className="text-[32px] leading-[40px] text-[#7dd3fc] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>30+</div>
              <div className="text-[12px] leading-[16px] tracking-[0.08em] text-[#a0b4c4] mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>LUT Presets</div>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <div className="text-[32px] leading-[40px] text-[#88b4cc] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>4K</div>
              <div className="text-[12px] leading-[16px] tracking-[0.08em] text-[#a0b4c4] mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>Export Quality</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
