export type TimeOfDay = "dawn" | "morning" | "day" | "evening" | "night";

export function timeOfDay(d: Date = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 8) return "dawn";
  if (h < 12) return "morning";
  if (h < 17) return "day";
  if (h < 21) return "evening";
  return "night";
}

export function greetingFor(tod: TimeOfDay, name?: string): string {
  const who = name ? `, ${name}` : "";
  switch (tod) {
    case "dawn":
      return `Up early${who}.`;
    case "morning":
      return `Good morning${who}.`;
    case "day":
      return `Good afternoon${who}.`;
    case "evening":
      return `Good evening${who}.`;
    case "night":
      return `Late night${who}.`;
  }
}

export const TOD_CLASS: Record<TimeOfDay, string> = {
  dawn: "tod-dawn",
  morning: "tod-morning",
  day: "tod-day",
  evening: "tod-evening",
  night: "tod-night",
};
