import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
      include: { defaultDeck: true },
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

    if (!deck) {
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
        defaultDeck: true,
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
        specVersion: string;
        previewImageUrl: string;
        backImageUrl: string;
        cardCount: number;
      } | null;
    }
  ): UserPreferencesDto {
    return {
      defaultDeckId: preference.defaultDeckId,
      defaultDeck: preference.defaultDeck
        ? {
            id: preference.defaultDeck.id,
            name: preference.defaultDeck.name,
            description: preference.defaultDeck.description,
            specVersion: preference.defaultDeck.specVersion,
            previewImageUrl: preference.defaultDeck.previewImageUrl,
            backImageUrl: preference.defaultDeck.backImageUrl,
            cardCount: preference.defaultDeck.cardCount,
          }
        : null,
      onboardingComplete: preference.onboardingCompletedAt !== null,
      updatedAt: preference.updatedAt.toISOString(),
    };
  }
}
