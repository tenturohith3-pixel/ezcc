"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [tidy, setTidy] = useState<{ email: string; subject: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const validate = (v: string) => /.+@.+\..+/.test(v);

  return (
    <form
      className="glass p-7 md:p-9 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || name.trim().length < 2) {
          setError("Add your name so we know who we're grading for.");
          return;
        }
        if (!validate(email)) {
          setError("That email doesn't look deliverable.");
          return;
        }
        if (message.trim().length < 10) {
          setError("Give us at least a sentence — budget and timeline welcome.");
          return;
        }
        const subject = `EffectCraft inquiry — ${name.trim()}`;
        const body = `${message.trim()}\n\n— ${name.trim()} (${email.trim()})`;
        setError(null);
        setTidy({ email: email.trim(), subject, body });
        window.location.href = `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }}
    >
      <p className="mono-label">INQUIRY</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="mono-label !text-[9px] block mb-2">NAME</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg bg-tint-soft border border-line px-4 py-3 text-sm outline-none focus:border-bronze/50 placeholder:text-ink-faint"
          />
        </label>
        <label className="block">
          <span className="mono-label !text-[9px] block mb-2">EMAIL</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.film"
            className="w-full rounded-lg bg-tint-soft border border-line px-4 py-3 text-sm outline-none focus:border-bronze/50 placeholder:text-ink-faint"
          />
        </label>
      </div>
      <label className="block">
        <span className="mono-label !text-[9px] block mb-2">PROJECT</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="What are you grading, how many frames, when does it ship?"
          className="w-full rounded-lg bg-tint-soft border border-line px-4 py-3 text-sm outline-none focus:border-bronze/50 placeholder:text-ink-faint resize-none"
        />
      </label>

      {error ? (
        <p className="text-[12px] text-[#f05545]">{error}</p>
      ) : null}

      {tidy && !error ? (
        <div className="rounded-lg border border-[#68c96a]/30 bg-[#68c96a]/[0.07] px-4 py-3 space-y-2">
          <p className="flex items-center gap-2 text-[12px] text-[#68c96a]">
            <CheckCircle2 className="size-3.5" />
            Mail client opened — here's a copy of the draft:
          </p>
          <p className="mono-num text-[11px] text-ink-muted break-all">{tidy.email}</p>
          <pre className="text-[11px] text-ink-muted whitespace-pre-wrap font-mono max-h-24 overflow-y-auto">
            {tidy.body}
          </pre>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(
                `To: ${tidy.email}\nSubject: ${tidy.subject}\n\n${tidy.body}`,
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="mono-num text-[11px] text-bronze-bright hover:text-bronze"
          >
            {copied ? "copied ✓" : "copy draft"}
          </button>
        </div>
      ) : null}

      <button type="submit" className="btn-primary w-full justify-center gap-2">
        <Send className="size-4" />
        Submit inquiry
      </button>
      <p className="mono-label !text-[8px] text-center !text-ink-faint">
        OPENS YOUR MAIL CLIENT — NOTHING UPLOADED, NO SERVER
      </p>
    </form>
  );
}
