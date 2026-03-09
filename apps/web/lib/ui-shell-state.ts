export type PanelSide = "left" | "right";
export type PanelMode = "expanded" | "collapsed";

export interface ReadingShellUiState {
  leftOpen: boolean;
  rightOpen: boolean;
}

export interface PersistedShellState {
  leftOpen?: boolean;
  rightOpen?: boolean;
}

export const LEFT_PANEL_STORAGE_KEY = "tarology.ui.leftPanelOpen";
export const RIGHT_PANEL_STORAGE_KEY = "tarology.ui.rightPanelOpen";

const DEFAULT_SHELL_STATE: ReadingShellUiState = {
  leftOpen: true,
  rightOpen: false,
};

function parseStoredBoolean(rawValue: string | null): boolean | null {
  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  return null;
}

export function getDefaultShellUiState(): ReadingShellUiState {
  return DEFAULT_SHELL_STATE;
}

export function panelModeFromOpen(isOpen: boolean): PanelMode {
  return isOpen ? "expanded" : "collapsed";
}

export function readShellUiState(storage: Storage | undefined): ReadingShellUiState {
  if (!storage) {
    return DEFAULT_SHELL_STATE;
  }

  try {
    const parsedLeft = parseStoredBoolean(storage.getItem(LEFT_PANEL_STORAGE_KEY));
    const parsedRight = parseStoredBoolean(storage.getItem(RIGHT_PANEL_STORAGE_KEY));

    return {
      leftOpen: parsedLeft ?? DEFAULT_SHELL_STATE.leftOpen,
      rightOpen: parsedRight ?? DEFAULT_SHELL_STATE.rightOpen,
    };
  } catch {
    return DEFAULT_SHELL_STATE;
  }
}

export function writeShellUiState(
  storage: Storage | undefined,
  shellState: ReadingShellUiState
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LEFT_PANEL_STORAGE_KEY, String(shellState.leftOpen));
    storage.setItem(RIGHT_PANEL_STORAGE_KEY, String(shellState.rightOpen));
  } catch {
    // Storage may be unavailable or quota-limited; ignore write failures.
  }
}
