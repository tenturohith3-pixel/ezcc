/**
 * Kinetic marquee — two lanes of enormous type running against each other.
 * Solid white over spectrum outline. Pauses on hover.
 */
const ROW_A = [
  "MAKE LIGHT OBEY",
  "GRADE IN THE BROWSER",
  "RUST AT THE CORE",
  "ZERO UPLOADS",
];

const ROW_B = [
  "65 PRISM MODULES",
  "DETAIL ENGINE ×4",
  "DETERMINISTIC 4K",
  "A KEY, NOT A SUBSCRIPTION",
];

function Lane({
  words,
  reverse,
  outline,
}: {
  words: string[];
  reverse?: boolean;
  outline?: boolean;
}) {
  return (
    <div className="flex w-max shrink-0">
      {[0, 1].map((half) => (
        <div
          key={half}
          className="flex shrink-0 items-center gap-8 pr-8 md:gap-14 md:pr-14"
        >
          {words.map((word) => (
            <span key={`${half}-${word}`} className="flex items-center gap-8 md:gap-14">
              <span
                className={`display whitespace-nowrap text-[10vw] font-bold uppercase leading-none tracking-[-0.05em] md:text-[5.2rem] ${
                  outline ? "outline-text" : "text-ink"
                }`}
              >
                {word}
              </span>
              <span className="text-[13px] text-bronze">✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function KineticMarquee() {
  return (
    <section
      aria-hidden
      className="marquee-paused relative select-none overflow-hidden border-y border-line bg-bg-raised/30 py-5 md:py-7"
    >
      <div className="marquee-lane">
        <Lane words={ROW_A} />
      </div>
      <div className="marquee-lane reverse mt-2 md:mt-4">
        <Lane words={ROW_B} outline />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg to-transparent md:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg to-transparent md:w-40" />
    </section>
  );
}
