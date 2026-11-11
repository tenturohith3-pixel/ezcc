import { SpectralBackdrop } from "@/components/v4/SpectralBackdrop";
import { HeroLab } from "@/components/v4/HeroLab";
import { KineticMarquee } from "@/components/v4/KineticMarquee";
import { LabBento } from "@/components/v4/LabBento";
import { LooksLab } from "@/components/v4/LooksLab";
import { ProcessRail } from "@/components/v4/ProcessRail";
import { CompareShowcase } from "@/components/landing/CompareShowcase";
import { PluginsTeaser } from "@/components/landing/PluginsTeaser";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { FinalCall } from "@/components/v4/FinalCall";
import { Reveal } from "@/components/site/Reveal";

export default function Home() {
  return (
    <main className="noise relative min-h-screen overflow-x-clip">
      <SpectralBackdrop />

      {/* 01 — the cockpit */}
      <HeroLab />

      {/* the spine */}
      <KineticMarquee />

      {/* 02 — the instrument panel */}
      <LabBento />

      {/* 03 — the looks vault */}
      <LooksLab />

      {/* 04 — the pipeline */}
      <ProcessRail />

      {/* 05 — proof, in your hands */}
      <section
        id="proof"
        className="relative px-6 py-24 md:px-10 md:py-32"
      >
        <div className="mx-auto max-w-[92rem]">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="hud-label">
                <span className="text-bronze">[05]</span> Proof, not promises
              </p>
              <h2 className="display mt-4 text-[clamp(2.7rem,5.6vw,4.9rem)] font-bold uppercase leading-[0.88]">
                Don&rsquo;t trust the demo.
                <br />
                <span className="spectrum-text">Drag the line.</span>
              </h2>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed text-ink-muted md:pb-2">
              Six signatures, one frame, two live canvases. The split is the
              same engine that ships in the Studio — rendered in this tab.
            </p>
          </div>
          <Reveal className="mt-14">
            <CompareShowcase />
          </Reveal>
        </div>
      </section>

      {/* 06 — the vault */}
      <PluginsTeaser />

      {/* 07 — ownership */}
      <PricingPreview />

      {/* 08 — cut to your frame */}
      <FinalCall />
    </main>
  );
}
