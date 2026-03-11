import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Deck as DeckRecord } from "@prisma/client";
import type { DeckSummary } from "@tarology/shared";
import { PrismaService } from "../database/prisma.service.js";
import {
  THOTH_DECK_ID,
  THOTH_DECK_SPEC,
  type TarotDeckSpec,
} from "./domain/thoth-deck-spec.js";

@Injectable()
export class DeckCatalogService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async listDecks(): Promise<DeckSummary[]> {
    const decks = await this.prisma.deck.findMany({
      orderBy: { name: "asc" },
    });

    return decks
      .filter((deck) => this.getDeckSpecOrNull(deck.id) !== null)
      .map((deck) => this.toDeckSummary(deck));
  }

  async getDeckSummary(deckId: string): Promise<DeckSummary | null> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck || this.getDeckSpecOrNull(deckId) === null) {
      return null;
    }

    return this.toDeckSummary(deck);
  }

  async requireDeck(deckId: string): Promise<{ summary: DeckSummary; spec: TarotDeckSpec }> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
    });

    const spec = this.getDeckSpecOrNull(deckId);
    if (!deck || !spec) {
      throw new NotFoundException(`Deck "${deckId}" is not available.`);
    }

    return {
      summary: this.toDeckSummary(deck),
      spec,
    };
  }

  private getDeckSpecOrNull(deckId: string): TarotDeckSpec | null {
    if (deckId === THOTH_DECK_ID) {
      return THOTH_DECK_SPEC;
    }

    return null;
  }

  private toDeckSummary(deck: DeckRecord): DeckSummary {
    return {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      specVersion: deck.specVersion,
      previewImageUrl: deck.previewImageUrl,
      backImageUrl: deck.backImageUrl,
      cardCount: deck.cardCount,
    };
  }
}
