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
