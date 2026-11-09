"use client";

import { useState } from "react";
import { KeyRound, CheckCircle2, AlertTriangle, LoaderCircle } from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { TIER_LABEL } from "@/lib/license";

export function KeyEntryModal({ onClose }: { onClose: () => void }) {
  const { activate, license, deactivate } = useLicense();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center px-4">
      <div className="absolute inset-0 scrim backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-bg-raised shadow-2xl overflow-hidden">
        <header className="px-6 py-5 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="display text-lg">Activate a key</h2>
            <p className="mono-label !text-[9px] mt-1">SERVER-VERIFIED · HMAC-SIGNED</p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl" aria-label="Close">
            ×
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-4 text-bronze-bright" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ECXXX-XXXX-XXXX-XXXX-XXX"
              spellCheck={false}
              className="flex-1 rounded-lg bg-tint-soft border border-line px-4 py-3 text-sm font-mono tracking-wider placeholder:text-ink-faint focus:border-bronze/50 outline-none"
            />
          </div>

          {result ? (
            <p
              className={
                result.ok
                  ? "flex items-center gap-2 text-[12px] text-[#68c96a]"
                  : "flex items-center gap-2 text-[12px] text-[#f05545]"
              }
            >
              {result.ok ? <CheckCircle2 className="size-3.5 shrink-0" /> : <AlertTriangle className="size-3.5 shrink-0" />}
              {result.msg}
            </p>
          ) : null}

          {license ? (
            <p className="mono-num text-[11px] text-ink-muted truncate">
              Active — {TIER_LABEL[license.tier]} · {license.key}
            </p>
          ) : null}

          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setResult(null);
              const r = await activate(input);
              setBusy(false);
              setResult({
                ok: r.ok,
                msg: r.ok
                  ? `Key verified — ${TIER_LABEL[r.tier]} unlocked.`
                  : r.error ?? "Key rejected.",
              });
              if (r.ok) {
                window.setTimeout(onClose, 800);
              }
            }}
            className={busy ? "btn-primary w-full justify-center opacity-70" : "btn-primary w-full justify-center"}
          >
            {busy ? (
              <>
                <LoaderCircle className="size-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Validate & activate"
            )}
          </button>

          <p className="text-[10.5px] text-ink-faint leading-relaxed">
            No key yet? The team mints them — see{" "}
            <a
              href="mailto:support@effectcraft.studio?subject=Key%20request"
              className="text-bronze-bright/90 hover:text-bronze-bright"
            >
              support@effectcraft.studio
            </a>{" "}
            or the pricing page.
          </p>

          {license ? (
            <button onClick={deactivate} className="text-[12px] text-ink-faint hover:text-ink w-full text-center">
              Deactivate current key
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
