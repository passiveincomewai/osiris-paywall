// Global loading state — shown during client-side navigation while the next
// page's content streams in. Kept featherweight (no JS) so it paints instantly.
export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: "#050810" }}
      aria-busy="true"
      aria-label="Loading"
    >
      <img
        src="/worldeye-eye.png"
        alt="WorldEye"
        width={72}
        height={72}
        className="animate-pulse"
        style={{ filter: "drop-shadow(0 0 24px rgba(0,150,255,0.45))" }}
      />
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full bg-[#0096FF] animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-[#0096FF] animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-[#0096FF] animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
