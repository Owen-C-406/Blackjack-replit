import { type GameState, type Card } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getGameState(id: string): Promise<GameState | undefined>;
  createGameState(): Promise<GameState>;
  updateGameState(id: string, gameState: Partial<GameState>): Promise<GameState>;
}

export class MemStorage implements IStorage {
  private gameStates: Map<string, GameState>;

  constructor() {
    this.gameStates = new Map();
  }

  async getGameState(id: string): Promise<GameState | undefined> {
    return this.gameStates.get(id);
  }

  async createGameState(): Promise<GameState> {
    const id = randomUUID();
    const gameState: GameState = {
      id,
      deck: this.createShuffledDeck(),
      playerHand: [],
      dealerHand: [],
      playerScore: 0,
      dealerScore: 0,
      gameActive: false,
      gameStatus: "Press Deal to start new game",
      wins: 0,
      losses: 0,
      ties: 0,
    };
    this.gameStates.set(id, gameState);
    return gameState;
  }

  async updateGameState(id: string, updates: Partial<GameState>): Promise<GameState> {
    const existing = this.gameStates.get(id);
    if (!existing) {
      throw new Error(`Game state ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.gameStates.set(id, updated);
    return updated;
  }

  private createShuffledDeck(): Card[] {
    const suits: Card['suit'][] = ['♠', '♥', '♦', '♣'];
    const values: Card['value'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];

    // Create full deck
    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          suit,
          value,
          numValue: this.getCardNumValue(value),
        });
      }
    }

    // Shuffle using Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  private getCardNumValue(value: Card['value']): number {
    if (value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(value)) return 10;
    return parseInt(value);
  }
}

export const storage = new MemStorage();
