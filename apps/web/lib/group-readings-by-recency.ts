import type { ReadingHistoryItem } from "./reading-studio-mock";

export type HistoryGroupLabel = "Today" | "Yesterday" | "Previous 7 Days" | "Older";

export interface HistoryGroup {
  label: HistoryGroupLabel;
  items: ReadingHistoryItem[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getHistoryGroupLabel(readingDate: Date, now: Date): HistoryGroupLabel {
  const dayDelta = Math.floor(
    (startOfDay(now).getTime() - startOfDay(readingDate).getTime()) / MS_PER_DAY
  );

  if (dayDelta <= 0) {
    return "Today";
  }

  if (dayDelta === 1) {
    return "Yesterday";
  }

  if (dayDelta <= 7) {
    return "Previous 7 Days";
  }

  return "Older";
}

export function groupReadingsByRecency(
  readings: ReadingHistoryItem[],
  now: Date = new Date()
): HistoryGroup[] {
  const sortedReadings = [...readings].sort((left, right) => {
    return (
      new Date(right.createdAtIso).getTime() - new Date(left.createdAtIso).getTime()
    );
  });

  const groupedMap = new Map<HistoryGroupLabel, ReadingHistoryItem[]>([
    ["Today", []],
    ["Yesterday", []],
    ["Previous 7 Days", []],
    ["Older", []],
  ]);

  for (const reading of sortedReadings) {
    const groupLabel = getHistoryGroupLabel(new Date(reading.createdAtIso), now);
    const bucket = groupedMap.get(groupLabel);
    if (bucket) {
      bucket.push(reading);
    }
  }

  return [...groupedMap.entries()]
    .map(([label, items]) => ({ label, items }))
    .filter((group) => group.items.length > 0);
}
