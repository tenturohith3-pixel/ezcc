import type { Metadata } from "next";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";

export const metadata: Metadata = {
  title: "Studio — Grade in the browser",
  description:
    "The EffectCraft grading engine: film looks, 3-way wheels, 8-channel HSL, .cube LUTs, deterministic 4K export, and a neural AI level-up (ESRGAN) plus a Rust Detail-Engine — fully client-side.",
};

export default function StudioPage() {
  return (
    <main>
      <StudioWorkspace />
    </main>
  );
}
