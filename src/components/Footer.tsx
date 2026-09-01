"use client";

export default function Footer() {
  return (
    <footer className="w-full py-16 bg-[#0a0e1a] border-t border-white/10 text-[#7dd3fc] text-xs tracking-[0.08em] uppercase font-medium relative z-10 mt-20" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-16 items-center max-w-screen-2xl mx-auto">
        <div className="text-[32px] leading-[40px] text-[#e0e8f0] font-semibold opacity-80 hover:opacity-100 transition-opacity" style={{ fontFamily: "'Inter', sans-serif" }}>
          © 2026 ColorGrade. Professional Cinematic Precision.
        </div>
        <div className="flex flex-wrap gap-6 justify-start md:justify-end">
          {["Privacy Policy", "Terms of Service", "API Docs", "Support", "Community"].map((link) => (
            <a key={link} href="#" className="text-[#a0b4c4] hover:text-[#7dd3fc] transition-all opacity-80 hover:opacity-100 font-medium">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
