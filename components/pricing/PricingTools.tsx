"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { KeyEntryModal } from "@/components/studio/KeyEntryModal";

export function PricingTools() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-3 lg:items-end">
      <button onClick={() => setOpen(true)} className="btn-primary gap-2">
        <KeyRound className="size-4" />
        I have a key — activate
      </button>
      <p className="hud-label !text-[8px] lg:text-right">
        Keys are minted privately by the team — contact to buy
      </p>
      {open ? <KeyEntryModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
