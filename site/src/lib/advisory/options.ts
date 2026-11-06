/**
 * The choices on the "Help me choose" form.
 *
 * Kept apart from the store so the client form can import them without
 * pulling server code into the bundle. Each value is what is stored; the label
 * is what the buyer and the advisor read.
 */

export type AdvisoryOption = { label: string; value: string };

export const ADVISORY_BUDGETS: readonly AdvisoryOption[] = [
  { label: "Under $1,000", value: "under-1000" },
  { label: "$1,000 – $5,000", value: "1000-5000" },
  { label: "$5,000 – $15,000", value: "5000-15000" },
  { label: "$15,000 and up", value: "15000-plus" },
  { label: "Not sure yet", value: "unsure" },
];

export const ADVISORY_ROOMS: readonly AdvisoryOption[] = [
  { label: "Living room", value: "living-room" },
  { label: "Bedroom", value: "bedroom" },
  { label: "Dining room", value: "dining-room" },
  { label: "Office or study", value: "office" },
  { label: "Hallway or entrance", value: "hallway" },
  { label: "Workplace or hospitality space", value: "commercial" },
  { label: "Somewhere else", value: "other" },
];

export const ADVISORY_SIZES: readonly AdvisoryOption[] = [
  { label: "Small (under 50 cm / 20 in)", value: "small" },
  { label: "Medium (50 – 100 cm / 20 – 40 in)", value: "medium" },
  { label: "Large (over 100 cm / 40 in)", value: "large" },
  { label: "Not sure yet", value: "unsure" },
];

export const ADVISORY_TIMELINES: readonly AdvisoryOption[] = [
  { label: "No rush, just exploring", value: "exploring" },
  { label: "In the next month", value: "month" },
  { label: "In the next three months", value: "quarter" },
  { label: "By a particular date (tell us below)", value: "date" },
];

export const MAX_ADVISORY_STYLE_LENGTH = 300;
export const MAX_ADVISORY_NOTES_LENGTH = 2000;
export const MAX_ADVISORY_NAME_LENGTH = 120;

export function labelFor(
  options: readonly AdvisoryOption[],
  value: string
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
