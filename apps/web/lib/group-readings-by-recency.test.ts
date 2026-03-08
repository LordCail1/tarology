import { describe, expect, it } from "vitest";
import {
  groupReadingsByRecency,
  type HistoryGroup,
} from "./group-readings-by-recency";
import type { ReadingHistoryItem } from "./reading-studio-mock";

function flattenIds(groups: HistoryGroup[]): string[] {
  return groups.flatMap((group) => group.items.map((item) => item.id));
}

describe("groupReadingsByRecency", () => {
  it("groups readings into recency buckets with descending order", () => {
    const readings: ReadingHistoryItem[] = [
      {
        id: "reading_today",
        title: "Today reading",
        createdAtIso: "2026-03-10T09:00:00.000Z",
        createdAtLabel: "Today",
        cardCount: 3,
        status: "active",
      },
      {
        id: "reading_yesterday",
        title: "Yesterday reading",
        createdAtIso: "2026-03-09T14:00:00.000Z",
        createdAtLabel: "Yesterday",
        cardCount: 4,
        status: "paused",
      },
      {
        id: "reading_prev_1",
        title: "Previous week reading A",
        createdAtIso: "2026-03-05T17:00:00.000Z",
        createdAtLabel: "Last week",
        cardCount: 5,
        status: "complete",
      },
      {
        id: "reading_prev_2",
        title: "Previous week reading B",
        createdAtIso: "2026-03-03T08:00:00.000Z",
        createdAtLabel: "Last week",
        cardCount: 2,
        status: "complete",
      },
      {
        id: "reading_older",
        title: "Older reading",
        createdAtIso: "2026-02-20T10:00:00.000Z",
        createdAtLabel: "Older",
        cardCount: 6,
        status: "complete",
      },
    ];

    const now = new Date("2026-03-10T20:00:00.000Z");
    const groups = groupReadingsByRecency(readings, now);

    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Previous 7 Days",
      "Older",
    ]);

    expect(flattenIds(groups)).toEqual([
      "reading_today",
      "reading_yesterday",
      "reading_prev_1",
      "reading_prev_2",
      "reading_older",
    ]);
  });

  it("omits empty buckets from the output", () => {
    const readings: ReadingHistoryItem[] = [
      {
        id: "reading_today_only",
        title: "Only reading",
        createdAtIso: "2026-03-10T11:00:00.000Z",
        createdAtLabel: "Today",
        cardCount: 3,
        status: "active",
      },
    ];

    const now = new Date("2026-03-10T20:00:00.000Z");
    const groups = groupReadingsByRecency(readings, now);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe("Today");
    expect(groups[0]?.items.map((item) => item.id)).toEqual(["reading_today_only"]);
  });
});
