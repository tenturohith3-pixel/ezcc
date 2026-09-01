"use client";

import Link from "next/link";

const tiers = [
  {
    name: "Basic",
    tagline: "Start Here",
    description: "Try the basics — no key needed",
    duration: "Free forever",
    features: ["8 LUT presets", "White balance", "Exposure & contrast", "Saturation & brightness", "1080p export"],
    popular: false,
    accent: "#a0b4c4",
    cta: "Try Free",
    keyRequired: false,
  },
  {
    name: "Pro",
    tagline: "Most Popular",
    description: "Full color grading control",
    duration: "30-day key",
    features: ["Everything in Basic", "3-Way color wheels", "HSL target isolation", "Custom 3D LUT import", "4K export", "Priority processing"],
    popular: true,
    accent: "#7dd3fc",
    cta: "Get Pro Key",
    keyRequired: true,
  },
  {
    name: "Studio",
    tagline: "For Professionals",
    description: "Complete cinematic toolkit",
    duration: "1-year key",
    features: ["Everything in Pro", "HDR emulation", "Film grain & halation", "Bloom effects", "Unlimited exports", "Priority support"],
    popular: false,
    accent: "#0ea5e9",
    cta: "Get Studio Key",
    keyRequired: true,
  },
  {
    name: "Lifetime",
    tagline: "Best Value",
    description: "Pay once, grade forever",
    duration: "Never expires",
    features: ["Everything in Studio", "Lifetime updates", "All future features", "Priority support", "Commercial license"],
    popular: false,
    accent: "#00f0ff",
    cta: "Get Lifetime Key",
    keyRequired: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-32 md:py-44 px-5 md:px-16 max-w-screen-2xl mx-auto relative z-10">
      <div className="text-center mb-20">
        <h2 className="text-[48px] leading-[56px] tracking-[-0.02em] font-bold text-gradient mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          Start Free. Unlock with a Key.
        </h2>
        <p className="text-[18px] leading-[32px] text-[#a0b4c4] max-w-2xl mx-auto font-light" style={{ fontFamily: "'Inter', sans-serif" }}>
          Use the editor for free, or enter an access key to unlock professional tools. No account required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-2xl overflow-hidden border border-white/10">
        {tiers.map((tier) => (
          <div key={tier.name} className={`p-8 flex flex-col relative transition-all duration-300 hover:bg-[#1a2438]/60 ${tier.popular ? "bg-[#141c2e]/80" : "bg-[#111828]/60"}`}>
            {tier.popular && <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#7dd3fc]" />}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: tier.accent }} />
                <span className="text-[14px] leading-[20px] tracking-[0.05em] font-medium text-[#a0b4c4] uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>{tier.tagline}</span>
              </div>
              <h3 className="text-2xl text-[#e0e8f0] mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>{tier.name}</h3>
              <p className="text-sm text-[#a0b4c4] mb-2">{tier.description}</p>
              <span className="text-xs font-medium" style={{ color: tier.accent }}>{tier.duration}</span>
            </div>
            <ul className="space-y-3 mb-10 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-[#a0b4c4]">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: tier.accent }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href={tier.keyRequired ? "#pricing" : "/tool"} className={`w-full py-3 rounded-full text-sm font-semibold transition-all duration-300 text-center ${tier.popular ? "iridescent-btn" : "border border-white/15 text-[#7dd3fc] hover:bg-[#1a2438]"}`}>
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-16 max-w-2xl mx-auto text-center">
        <h3 className="text-xl text-[#e0e8f0] mb-4 font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>How Key Access Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Get a Key", desc: "Purchase a key for your desired tier" },
            { step: "02", title: "Enter in Tool", desc: "Paste your key in the editor — instant unlock" },
            { step: "03", title: "Start Grading", desc: "Use all features until the key expires" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="text-2xl text-[#7dd3fc] mb-2 font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>{item.step}</div>
              <div className="text-sm font-semibold text-[#e0e8f0] mb-1">{item.title}</div>
              <div className="text-xs text-[#a0b4c4]">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-[10px] text-[#3a4a60] mt-10 tracking-wide">Keys are single-use and non-transferable. Basic tier requires no key.</p>
    </section>
  );
}
