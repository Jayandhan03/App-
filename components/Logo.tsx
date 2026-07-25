/**
 * Leora's mark — matches the app icon/favicon exactly (app/icon.svg): a
 * fixed near-black rounded square with the three-bar waveform, same in
 * every theme, same everywhere the brand mark appears.
 */
export default function Logo({ className = "", size = 27 }: { className?: string; size?: number }) {
  return (
    <span className={`mark ${className}`.trim()} style={{ width: size, height: size, background: "transparent", boxShadow: "none" }}>
      <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
        <rect width="128" height="128" rx="28" fill="#131519" />
        <path d="M40 82V52M64 92V36M88 82V46" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
      </svg>
    </span>
  );
}
