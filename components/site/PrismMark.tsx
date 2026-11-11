import { cn } from "@/lib/cn";

/** The spectrum glyph — four refracted bars under a hairline of light. */
export function PrismMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line-strong/70 bg-bg-raised",
        className,
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: "var(--prism)" }}
      />
      <span className="flex -rotate-[8deg] items-end gap-[3px]">
        <span className="h-2.5 w-[3px] rounded-full bg-prism-a" />
        <span className="h-4 w-[3px] rounded-full bg-prism-b" />
        <span className="h-3 w-[3px] rounded-full bg-prism-c" />
        <span className="h-2 w-[3px] rounded-full bg-prism-d" />
      </span>
    </span>
  );
}
