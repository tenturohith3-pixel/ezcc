/**
 * The room around the lab — a fixed, breathing spectral field.
 * Blueprint grid, three chromatic auroras, and a refracted cone of light.
 * Pure CSS so it never blocks paint and survives reduced-motion.
 */
export function SpectralBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      {/* blueprint grid, faded toward the edges */}
      <div
        className="grid-fine absolute inset-0"
        style={{
          maskImage:
            "radial-gradient(ellipse 85% 75% at 50% 35%, black 10%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 35%, black 10%, transparent 78%)",
        }}
      />

      {/* refracted cone */}
      <div
        className="absolute -top-[38%] left-1/2 h-[90vh] w-[150vw] -translate-x-1/2 opacity-[0.13] blur-[110px]"
        style={{
          background:
            "conic-gradient(from 200deg at 50% 60%, #c9ff3f, #3ce8ff 24%, #8b5cff 48%, #ff4d9d 68%, transparent 82%)",
        }}
      />

      {/* drifting auroras */}
      <div
        className="aurora-blob ambient-a -left-[14%] top-[8%] size-[34rem]"
        style={{
          background:
            "radial-gradient(circle, rgba(201,255,63,0.55), transparent 66%)",
        }}
      />
      <div
        className="aurora-blob ambient-b right-[-10%] top-[22%] size-[38rem]"
        style={{
          background:
            "radial-gradient(circle, rgba(60,232,255,0.4), transparent 66%)",
        }}
      />
      <div
        className="aurora-blob ambient-a bottom-[-12%] left-[28%] size-[42rem]"
        style={{
          animationDelay: "-7s",
          background:
            "radial-gradient(circle, rgba(139,92,255,0.36), transparent 66%)",
        }}
      />

      {/* bottom fade so content always wins */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
}
