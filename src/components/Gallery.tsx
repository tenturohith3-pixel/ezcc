"use client";

import { useState, useRef, useCallback } from "react";

interface BeforeAfterCardProps {
  title: string;
  preset: string;
  beforeImage: string;
  afterImage: string;
  size?: "large" | "normal";
}

function BeforeAfterCard({ title, preset, beforeImage, afterImage, size = "normal" }: BeforeAfterCardProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handleStart = (clientX: number) => {
    isDragging.current = true;
    updatePosition(clientX);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-col-resize group ${size === "large" ? "aspect-[16/10]" : "aspect-[3/4]"}`}
      style={{ borderRadius: "12px" }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => isDragging.current && updatePosition(e.clientX)}
      onMouseUp={() => (isDragging.current = false)}
      onMouseLeave={() => (isDragging.current = false)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => updatePosition(e.touches[0].clientX)}
      onTouchEnd={() => (isDragging.current = false)}
    >
      <div className="absolute inset-0">
        <img src={beforeImage} alt={`${title} - Before`} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={afterImage} alt={`${title} - ${preset}`} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="absolute top-0 bottom-0 w-[2px] z-10" style={{ left: `${position}%`, transform: "translateX(-50%)", background: "#7dd3fc", boxShadow: "0 0 12px rgba(125,211,252,0.5), 0 0 24px rgba(125,211,252,0.2)" }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full backdrop-blur-sm flex items-center justify-center" style={{ background: "rgba(125, 211, 252, 0.9)", border: "2px solid rgba(255,255,255,0.25)", boxShadow: "0 0 16px rgba(125,211,252,0.4)" }}>
          <div className="flex gap-1">
            <div className="w-0.5 h-3 rounded-full bg-white/80" />
            <div className="w-0.5 h-3 rounded-full bg-white/80" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 z-10">
        <span className="text-[9px] text-white/50 tracking-[0.15em] uppercase bg-black/40 px-2.5 py-1.5 backdrop-blur-sm rounded-sm">Before</span>
      </div>
      <div className="absolute bottom-3 right-3 z-10">
        <span className="text-[9px] text-white/50 tracking-[0.15em] uppercase bg-black/40 px-2.5 py-1.5 backdrop-blur-sm rounded-sm">{preset}</span>
      </div>
    </div>
  );
}

const galleryItems = [
  { title: "Moody Teal & Orange", preset: "Moody Cinematic", beforeImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", afterImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", size: "large" as const },
  { title: "Warm Golden Hour", preset: "Warm Tone", beforeImage: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80", afterImage: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80", size: "normal" as const },
  { title: "Clean Desaturated", preset: "Clean Minimal", beforeImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80", afterImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80", size: "normal" as const },
  { title: "Vintage Film", preset: "Film Emulation", beforeImage: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80", afterImage: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80", size: "large" as const },
  { title: "Muted Pastel", preset: "Soft Pastel", beforeImage: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&q=80", afterImage: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&q=80", size: "normal" as const },
  { title: "Slate Noir", preset: "Noir Grade", beforeImage: "https://images.unsplash.com/photo-1518173946687-a16d22856aa4?w=600&q=80", afterImage: "https://images.unsplash.com/photo-1518173946687-a16d22856aa4?w=600&q=80", size: "normal" as const },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-32 md:py-44 px-5 md:px-16 max-w-screen-2xl mx-auto relative z-10">
      <div className="text-center mb-20">
        <h2 className="text-[48px] leading-[56px] tracking-[-0.02em] font-bold text-gradient mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          See the <span className="text-[#7dd3fc]">Transformation</span>
        </h2>
        <p className="text-[18px] leading-[32px] text-[#a0b4c4] max-w-2xl mx-auto font-light" style={{ fontFamily: "'Inter', sans-serif" }}>
          Drag the slider to compare original footage with our cinematic color grades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-7"><GalleryCard item={galleryItems[0]} index={0} /></div>
        <div className="md:col-span-5 flex flex-col gap-5">
          <GalleryCard item={galleryItems[1]} index={1} />
          <GalleryCard item={galleryItems[2]} index={2} />
        </div>
        <div className="md:col-span-5 flex flex-col gap-5">
          <GalleryCard item={galleryItems[4]} index={4} />
          <GalleryCard item={galleryItems[5]} index={5} />
        </div>
        <div className="md:col-span-7"><GalleryCard item={galleryItems[3]} index={3} /></div>
      </div>
    </section>
  );
}

function GalleryCard({ item, index }: { item: typeof galleryItems[0]; index: number }) {
  return (
    <div className="group relative">
      <div className="glacier-card p-1 md:p-1.5 rounded-2xl transition-all duration-500 hover:translate-y-[-2px]">
        <div className="relative overflow-hidden rounded-xl">
          <BeforeAfterCard {...item} afterImage={item.afterImage} />
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 px-1">
        <div>
          <h4 className="text-sm text-[#e0e8f0] mb-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>{item.title}</h4>
          <p className="text-[10px] text-[#a0b4c4] tracking-[0.1em] uppercase">{item.preset}</p>
        </div>
        <span className="text-[10px] text-[#3a4a60] tracking-[0.05em]">{`0${index + 1}`}</span>
      </div>
    </div>
  );
}
