import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { DeckSummary } from "@tarology/shared";
import type {
  GetPreferencesResponse,
  UserPreferencesDto,
} from "@tarology/shared";
import { PrismaService } from "../database/prisma.service.js";

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<GetPreferencesResponse> {
    const preference = await this.prisma.userPreference.findUnique({
      where: { userId },
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

    if (!preference) {
      throw new NotFoundException("Preferences not found.");
    }

    return {
      preferences: this.toPreferencesDto(preference),
    };
  }

  async updateDefaultDeck(userId: string, defaultDeckId: string): Promise<GetPreferencesResponse> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: defaultDeckId },
    });

    if (!deck || deck.ownerUserId !== userId) {
      throw new NotFoundException(`Deck "${defaultDeckId}" is not available.`);
    }

    const existing = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: { onboardingCompletedAt: true },
    });

    if (!existing) {
      throw new NotFoundException("Preferences not found.");
    }

    const updated = await this.prisma.userPreference.update({
      where: { userId },
      data: {
        defaultDeckId,
        onboardingCompletedAt: existing.onboardingCompletedAt ?? new Date(),
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

    return {
      preferences: this.toPreferencesDto(updated),
    };
  }

  private toPreferencesDto(
    preference: {
      defaultDeckId: string | null;
      onboardingCompletedAt: Date | null;
      updatedAt: Date;
      defaultDeck?: {
        id: string;
        name: string;
        description: string | null;
        deckSpecVersion: string;
        knowledgeVersion: number;
        initializationMode: string;
        initializerKey: string | null;
        previewImageUrl: string | null;
        backImageUrl: string | null;
        cardCount: number;
        _count?: {
          symbols: number;
        };
      } | null;
    }
  ): UserPreferencesDto {
    const defaultDeck: DeckSummary | null = preference.defaultDeck
      ? {
          id: preference.defaultDeck.id,
          name: preference.defaultDeck.name,
          description: preference.defaultDeck.description,
          specVersion: preference.defaultDeck.deckSpecVersion,
          knowledgeVersion: preference.defaultDeck.knowledgeVersion,
          initializationMode:
            preference.defaultDeck.initializationMode as DeckSummary["initializationMode"],
          initializerKey: preference.defaultDeck.initializerKey,
          previewImageUrl: preference.defaultDeck.previewImageUrl,
          backImageUrl: preference.defaultDeck.backImageUrl,
          cardCount: preference.defaultDeck.cardCount,
          symbolCount: preference.defaultDeck._count?.symbols ?? 0,
        }
      : null;

    return {
      defaultDeckId: preference.defaultDeckId,
      defaultDeck,
      onboardingComplete: preference.onboardingCompletedAt !== null,
      updatedAt: preference.updatedAt.toISOString(),
    };
  }
}
