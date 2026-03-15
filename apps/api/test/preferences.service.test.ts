import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PreferencesService } from "../src/profile/preferences.service.js";

describe("PreferencesService", () => {
  it("returns empty onboarding state before a default deck is selected", async () => {
    const updatedAt = new Date("2026-03-11T12:00:00.000Z");
    const prisma = {
      userPreference: {
        findUnique: vi.fn().mockResolvedValue({
          defaultDeckId: null,
          onboardingCompletedAt: null,
          updatedAt,
          defaultDeck: null,
        }),
      },
    };

    const service = new PreferencesService(prisma as never);
    const response = await service.getPreferences("user-1");

    expect(response).toEqual({
      preferences: {
        defaultDeckId: null,
        defaultDeck: null,
        onboardingComplete: false,
        updatedAt: updatedAt.toISOString(),
      },
    });
  });

  it("persists the first onboarding completion timestamp and keeps it stable later", async () => {
    const firstCompletedAt = new Date("2026-03-11T12:05:00.000Z");
    const updatedAt = new Date("2026-03-11T12:10:00.000Z");
    const prisma = {
      deck: {
        findUnique: vi.fn().mockResolvedValue({
          id: "deck_thoth_owned",
          ownerUserId: "user-1",
          name: "Thoth Tarot",
          description: "Deck",
          deckSpecVersion: "thoth-v1",
          knowledgeVersion: 1,
          initializationMode: "starter_content",
          initializerKey: "thoth",
          previewImageUrl: "/images/cards/thoth/TheSun.jpg",
          backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
          cardCount: 78,
        }),
      },
      userPreference: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ onboardingCompletedAt: firstCompletedAt })
          .mockResolvedValueOnce({
            defaultDeckId: "deck_thoth_owned",
            onboardingCompletedAt: firstCompletedAt,
            updatedAt,
            defaultDeck: {
              id: "deck_thoth_owned",
              name: "Thoth Tarot",
              description: "Deck",
              deckSpecVersion: "thoth-v1",
              knowledgeVersion: 1,
              initializationMode: "starter_content",
              initializerKey: "thoth",
              previewImageUrl: "/images/cards/thoth/TheSun.jpg",
              backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
              cardCount: 78,
              _count: {
                symbols: 8,
              },
            },
          }),
        update: vi.fn().mockResolvedValue({
          defaultDeckId: "deck_thoth_owned",
          onboardingCompletedAt: firstCompletedAt,
          updatedAt,
          defaultDeck: {
            id: "deck_thoth_owned",
            name: "Thoth Tarot",
            description: "Deck",
            deckSpecVersion: "thoth-v1",
            knowledgeVersion: 1,
            initializationMode: "starter_content",
            initializerKey: "thoth",
            previewImageUrl: "/images/cards/thoth/TheSun.jpg",
            backImageUrl: "/images/cards/thoth/backofcard/BackOfCard.jpg",
            cardCount: 78,
            _count: {
              symbols: 8,
            },
          },
        }),
      },
    };

    const service = new PreferencesService(prisma as never);
    const response = await service.updateDefaultDeck("user-1", "deck_thoth_owned");

    expect(prisma.userPreference.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        defaultDeckId: "deck_thoth_owned",
        onboardingCompletedAt: firstCompletedAt,
      },
      include: {
        defaultDeck: {
          include: {
            _count: {
              select: {
                symbols: true,
              },
            },
          },
        },
      },
    });
    expect(response.preferences.onboardingComplete).toBe(true);
  });

  it("rejects unknown deck ids", async () => {
    const prisma = {
      deck: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new PreferencesService(prisma as never);

    await expect(service.updateDefaultDeck("user-1", "unknown")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
