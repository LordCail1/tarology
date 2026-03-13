import {
  coerceLayoutPreferences,
  getDefaultLayoutPreferences,
  getViewportWidth,
} from "./reading-studio-layout";
import type {
  ReadingStudioLayoutPreferences,
  ReadingStudioPreferenceAdapter,
} from "./reading-studio-types";

export const READING_STUDIO_LAYOUT_STORAGE_KEY = "tarology.ui.readingStudioLayout";

export function createLocalReadingStudioPreferenceAdapter(
  storage: Storage | undefined
): ReadingStudioPreferenceAdapter {
  return {
    async readLayoutPreferences(): Promise<ReadingStudioLayoutPreferences> {
      const viewportWidth = getViewportWidth();
      if (!storage) {
        return getDefaultLayoutPreferences(viewportWidth);
      }

      try {
        const rawValue = storage.getItem(READING_STUDIO_LAYOUT_STORAGE_KEY);
        if (!rawValue) {
          return getDefaultLayoutPreferences(viewportWidth);
        }

        return coerceLayoutPreferences(
          JSON.parse(rawValue) as Partial<ReadingStudioLayoutPreferences>,
          viewportWidth
        );
      } catch {
        return getDefaultLayoutPreferences(viewportWidth);
      }
    },
    async writeLayoutPreferences(next: ReadingStudioLayoutPreferences): Promise<void> {
      if (!storage) {
        return;
      }

      try {
        storage.setItem(READING_STUDIO_LAYOUT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write failures.
      }
    },
  };
}
