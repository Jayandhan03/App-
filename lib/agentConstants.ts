/** Shared agent configuration options — used by both the Dashboard's edit popovers and the Create-agent deploy flow. */

export const VOICES = ["Analytical", "Conversational", "Concise", "Editorial", "Neutral"];

export const LANGUAGES = ["English", "Español", "हिन्दी", "Français", "Deutsch", "العربية", "中文", "Português"];

/** Human language label -> gTTS-compatible short code, used by the backend TTS pipeline. */
export const LANGUAGE_CODES: Record<string, string> = {
  English: "en",
  Español: "es",
  हिन्दी: "hi",
  Français: "fr",
  Deutsch: "de",
  العربية: "ar",
  中文: "zh",
  日本語: "ja",
  Português: "pt",
};

export type Cadence = {
  label: string;
  icon: string;
  intervalMinutes: number;
  /** How many "HH:MM" time-of-day pickers this cadence needs (0 for interval-based cadences). */
  timeSlots: number;
  /** Whether this cadence also needs a day-of-week picker. */
  needsWeekday: boolean;
  defaultTimes: string[];
};

export const CADENCES: Cadence[] = [
  { label: "Real-time", icon: "⚡", intervalMinutes: 60, timeSlots: 0, needsWeekday: false, defaultTimes: [] },
  { label: "Hourly", icon: "🕐", intervalMinutes: 60, timeSlots: 0, needsWeekday: false, defaultTimes: [] },
  { label: "Twice daily", icon: "🌗", intervalMinutes: 720, timeSlots: 2, needsWeekday: false, defaultTimes: ["08:00", "18:00"] },
  { label: "Daily brief", icon: "☀️", intervalMinutes: 1440, timeSlots: 1, needsWeekday: false, defaultTimes: ["09:00"] },
  { label: "Weekly digest", icon: "📅", intervalMinutes: 10080, timeSlots: 1, needsWeekday: true, defaultTimes: ["09:00"] },
];

/** How far back an agent's news search looks — maps 1:1 to the backend's `time_published` filter. */
export type DataWindow = {
  value: "anytime" | "1h" | "1d" | "7d" | "1y";
  label: string;
  icon: string;
  blurb: string;
};

export const DATA_WINDOWS: DataWindow[] = [
  { value: "anytime", label: "Anytime", icon: "🌐", blurb: "No time limit — Leora pulls whatever's most relevant, even older or evergreen coverage." },
  { value: "1h", label: "Past hour", icon: "⚡", blurb: "Only stories from the last 60 minutes. Best for Real-time/Hourly delivery." },
  { value: "1d", label: "Past day", icon: "☀️", blurb: "Only today's stories. The default — matches a daily briefing." },
  { value: "7d", label: "Past week", icon: "📅", blurb: "The last 7 days. Good for a weekly digest or a slower-moving beat." },
  { value: "1y", label: "Past year", icon: "🗓️", blurb: "Broader trend coverage from the last 12 months. Good for evergreen topics like policy or research." },
];

/** Lookback window expressed in minutes, so it can be compared against a cadence's intervalMinutes. */
export function dataWindowMinutes(value: string): number {
  switch (value) {
    case "1h": return 60;
    case "1d": return 1440;
    case "7d": return 10080;
    case "1y": return 525600;
    default: return Infinity; // anytime
  }
}

/** Which cadence labels are a good practical pairing for a given lookback window. */
const BEST_CADENCES_BY_WINDOW: Record<string, string[]> = {
  "1h": ["Real-time", "Hourly"],
  "1d": ["Twice daily", "Daily brief"],
  "7d": ["Weekly digest"],
  "1y": ["Weekly digest"],
  anytime: ["Weekly digest"],
};

/** Cadence labels considered a good fit for the given lookback window (for highlighting, not warning). */
export function bestCadencesForWindow(dataWindow: string): string[] {
  return BEST_CADENCES_BY_WINDOW[dataWindow] ?? [];
}
