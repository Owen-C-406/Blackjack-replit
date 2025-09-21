import { z } from "zod";

export const cardSchema = z.object({
  suit: z.enum(['♠', '♥', '♦', '♣']),
  value: z.enum(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']),
  numValue: z.number().min(1).max(11),
});

export const gameStateSchema = z.object({
  id: z.string(),
  deck: z.array(cardSchema),
  playerHand: z.array(cardSchema),
  dealerHand: z.array(cardSchema),
  playerScore: z.number(),
  dealerScore: z.number(),
  gameActive: z.boolean(),
  gameStatus: z.string(),
  wins: z.number(),
  losses: z.number(),
  ties: z.number(),
});

export const gameActionSchema = z.object({
  action: z.enum(['deal', 'hit', 'stand']),
});

export type Card = z.infer<typeof cardSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type GameAction = z.infer<typeof gameActionSchema>;
