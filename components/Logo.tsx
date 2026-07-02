/** Leora's mark: an audio waveform, standing in for the voice-briefing product. */
export default function Logo({ className = "", size = 27 }: { className?: string; size?: number }) {
  return (
    <span className={`mark ${className}`.trim()} style={{ width: size, height: size }}>
      <svg
        width={Math.round(size * 0.5)}
        height={Math.round(size * 0.5)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 14v-4M8 16V8M12 19V5M16 16V8M20 14v-4" />
      </svg>
    </span>
  );
}
