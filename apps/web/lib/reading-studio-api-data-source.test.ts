import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreateReadingResponse,
  GetReadingResponse,
  ListReadingsResponse,
  UserPreferencesDto,
} from "@tarology/shared";
import {
  fetchReading,
  fetchReadings,
  postCreateReading,
  postReadingCommand,
} from "./client-api";
import { createApiReadingStudioDataSource } from "./reading-studio-api-data-source";
import { READING_STUDIO_ACTIVE_READING_STORAGE_KEY } from "./reading-studio-data-source";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

vi.mock("./client-api", () => ({
  fetchReadings: vi.fn(),
  fetchReading: vi.fn(),
  postCreateReading: vi.fn(),
  postReadingCommand: vi.fn(),
}));

const preferencesFixture: UserPreferencesDto = {
  defaultDeckId: "thoth",
  defaultDeck: {
    id: "thoth",
    name: "Thoth Tarot",
    description: "Starter deck",
    specVersion: "thoth-v1",
    knowledgeVersion: 1,
    initializationMode: "starter_content" as const,
    initializerKey: "thoth",
    previewImageUrl: "/images/cards/thoth/TheSun.jpg",
    backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
    cardCount: 78,
    symbolCount: 8,
  },
  onboardingComplete: true,
  updatedAt: "2026-03-15T00:00:00.000Z",
};

function createReadingDetail(
  overrides: Partial<GetReadingResponse> & Pick<GetReadingResponse, "readingId" | "rootQuestion">
): GetReadingResponse {
  const { readingId, rootQuestion, ...restOverrides } = overrides;

  return {
    readingId,
    rootQuestion,
    deckId: "thoth",
    deckSpecVersion: "thoth-v1",
    cardCount: 2,
    canvasMode: "freeform",
    status: "active",
    version: 1,
    createdAt: "2026-03-15T12:00:00.000Z",
    updatedAt: "2026-03-15T12:00:00.000Z",
    archivedAt: null,
    deletedAt: null,
    shuffleAlgorithmVersion: "seeded-fisher-yates-v1",
    seedCommitment: "seed",
    orderHash: "hash",
    assignments: [
      {
        deckIndex: 0,
        cardId: "The Magician",
        assignedReversal: false,
      },
      {
        deckIndex: 1,
        cardId: "The Sun",
        assignedReversal: true,
      },
    ],
    canvas: {
      activeMode: "freeform",
      cards: [
        {
          deckIndex: 0,
          cardId: "The Magician",
          assignedReversal: false,
          isFaceUp: false,
          rotationDeg: 0,
          freeform: {
            xPx: 120,
            yPx: 80,
            stackOrder: 1,
          },
          grid: {
            column: 0,
            row: 0,
          },
        },
        {
          deckIndex: 1,
          cardId: "The Sun",
          assignedReversal: true,
          isFaceUp: false,
          rotationDeg: 0,
          freeform: {
            xPx: 200,
            yPx: 80,
            stackOrder: 2,
          },
          grid: {
            column: 1,
            row: 0,
          },
        },
      ],
    },
    ...restOverrides,
  };
}

function createReadingSummary(detail: GetReadingResponse): ListReadingsResponse["readings"][number] {
  return {
    readingId: detail.readingId,
    rootQuestion: detail.rootQuestion,
    deckId: detail.deckId,
    deckSpecVersion: detail.deckSpecVersion,
    cardCount: detail.cardCount,
    canvasMode: detail.canvasMode,
    status: detail.status,
    version: detail.version,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    archivedAt: detail.archivedAt,
    deletedAt: detail.deletedAt,
  };
}

describe("reading-studio-api-data-source", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("loads history and restores the persisted active reading from the API", async () => {
    const readingOne = createReadingDetail({
      readingId: "rdg_001",
      rootQuestion: "Career realignment and confidence",
      version: 2,
      updatedAt: "2026-03-15T12:00:00.000Z",
    });
    const readingTwo = createReadingDetail({
      readingId: "rdg_002",
      rootQuestion: "Creative project momentum sprint",
      version: 4,
      updatedAt: "2026-03-15T13:00:00.000Z",
    });

    vi.mocked(fetchReadings).mockResolvedValue({
      readings: [createReadingSummary(readingTwo), createReadingSummary(readingOne)],
    });
    vi.mocked(fetchReading).mockResolvedValue(readingTwo);

    window.localStorage.setItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY, "rdg_002");

    const dataSource = createApiReadingStudioDataSource(
      window.localStorage,
      preferencesFixture
    );
    const snapshot = await dataSource.loadStudio();

    expect(snapshot.activeReadingId).toBe("rdg_002");
    expect(snapshot.history).toHaveLength(2);
    expect(snapshot.workspaces.rdg_002.reading.title).toBe("Creative project momentum sprint");
    expect(window.localStorage.getItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY)).toBe(
      "rdg_002"
    );
  });

  it("creates readings from the saved default deck and persists the active reading id", async () => {
    const created = createReadingDetail({
      readingId: "rdg_new",
      rootQuestion: "What needs a clearer frame?",
    }) as CreateReadingResponse;

    vi.mocked(postCreateReading).mockResolvedValue(created);

    const dataSource = createApiReadingStudioDataSource(
      window.localStorage,
      preferencesFixture
    );
    const workspace = await dataSource.createReading("What needs a clearer frame?");

    expect(postCreateReading).toHaveBeenCalledWith(
      {
        rootQuestion: "What needs a clearer frame?",
        deckId: "thoth",
        deckSpecVersion: "thoth-v1",
        canvasMode: "freeform",
      },
      expect.any(String)
    );
    expect(workspace.reading.id).toBe("rdg_new");
    expect(workspace.reading.title).toBe("What needs a clearer frame?");
    expect(window.localStorage.getItem(READING_STUDIO_ACTIVE_READING_STORAGE_KEY)).toBe(
      "rdg_new"
    );
  });

  it("maps semantic workspace actions onto reading commands", async () => {
    const detail = createReadingDetail({
      readingId: "rdg_003",
      rootQuestion: "Which motion matters?",
      version: 5,
      canvasMode: "grid",
      canvas: {
        activeMode: "grid",
        cards: [
          {
            deckIndex: 0,
            cardId: "The Magician",
            assignedReversal: false,
            isFaceUp: true,
            rotationDeg: 30,
            freeform: {
              xPx: 420,
              yPx: 210,
              stackOrder: 10,
            },
            grid: {
              column: 7,
              row: 5,
            },
          },
          {
            deckIndex: 1,
            cardId: "The Sun",
            assignedReversal: true,
            isFaceUp: false,
            rotationDeg: 0,
            freeform: {
              xPx: 200,
              yPx: 80,
              stackOrder: 2,
            },
            grid: {
              column: 1,
              row: 0,
            },
          },
        ],
      },
    });

    vi.mocked(postReadingCommand).mockResolvedValue({
      reading: detail,
    });

    const dataSource = createApiReadingStudioDataSource(
      window.localStorage,
      preferencesFixture
    );

    await dataSource.applyWorkspaceAction("rdg_003", 4, {
      type: "workspace.modeSwitched",
      mode: "grid",
    });
    await dataSource.applyWorkspaceAction("rdg_003", 5, {
      type: "workspace.cardMoved",
      cardId: "The Magician",
      grid: {
        column: 7,
        row: 5,
      },
    });
    await dataSource.applyWorkspaceAction("rdg_003", 6, {
      type: "workspace.cardRotated",
      cardId: "The Magician",
      deltaDeg: 15,
    });
    const workspace = await dataSource.applyWorkspaceAction("rdg_003", 7, {
      type: "workspace.cardFlipped",
      cardId: "The Magician",
    });

    expect(postReadingCommand).toHaveBeenNthCalledWith(
      1,
      "rdg_003",
      expect.objectContaining({
        expectedVersion: 4,
        type: "switch_canvas_mode",
        payload: {
          canvasMode: "grid",
        },
      }),
      expect.any(String)
    );
    expect(postReadingCommand).toHaveBeenNthCalledWith(
      2,
      "rdg_003",
      expect.objectContaining({
        expectedVersion: 5,
        type: "move_card",
        payload: {
          cardId: "The Magician",
          grid: {
            column: 7,
            row: 5,
          },
        },
      }),
      expect.any(String)
    );
    expect(postReadingCommand).toHaveBeenNthCalledWith(
      3,
      "rdg_003",
      expect.objectContaining({
        expectedVersion: 6,
        type: "rotate_card",
        payload: {
          cardId: "The Magician",
          deltaDeg: 15,
        },
      }),
      expect.any(String)
    );
    expect(postReadingCommand).toHaveBeenNthCalledWith(
      4,
      "rdg_003",
      expect.objectContaining({
        expectedVersion: 7,
        type: "flip_card",
        payload: {
          cardId: "The Magician",
        },
      }),
      expect.any(String)
    );
    expect(workspace.reading.id).toBe("rdg_003");
    expect(workspace.canvas.activeMode).toBe("grid");
  });

  it("falls back to RFC 4122 v4 ids when randomUUID is unavailable", async () => {
    const detail = createReadingDetail({
      readingId: "rdg_003",
      rootQuestion: "Which motion matters?",
      version: 5,
    });
    const getRandomValues = vi.fn((buffer: Uint8Array) => {
      buffer.set([
        0x10, 0x32, 0x54, 0x76, 0x98, 0xba, 0xdc, 0xfe, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66,
        0x77, 0x88,
      ]);
      return buffer;
    });

    vi.stubGlobal("crypto", {
      getRandomValues,
    } satisfies Pick<Crypto, "getRandomValues">);
    vi.mocked(postReadingCommand).mockResolvedValue({
      reading: detail,
    });

    const dataSource = createApiReadingStudioDataSource(
      window.localStorage,
      preferencesFixture
    );

    await dataSource.applyWorkspaceAction("rdg_003", 5, {
      type: "workspace.cardRotated",
      cardId: "The Magician",
      deltaDeg: 15,
    });

    expect(postReadingCommand).toHaveBeenCalledWith(
      "rdg_003",
      expect.objectContaining({
        commandId: expect.stringMatching(UUID_V4_PATTERN),
      }),
      expect.stringMatching(UUID_V4_PATTERN)
    );
    expect(getRandomValues).toHaveBeenCalled();
  });
});
