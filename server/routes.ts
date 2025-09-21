import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gameActionSchema, type GameState, type Card } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create new game
  app.post("/api/game", async (req, res) => {
    try {
      const gameState = await storage.createGameState();
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  // Get game state
  app.get("/api/game/:id", async (req, res) => {
    try {
      const gameState = await storage.getGameState(req.params.id);
      if (!gameState) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to get game state" });
    }
  });

  // Perform game action
  app.post("/api/game/:id/action", async (req, res) => {
    try {
      const { action } = gameActionSchema.parse(req.body);
      const gameState = await storage.getGameState(req.params.id);
      
      if (!gameState) {
        return res.status(404).json({ error: "Game not found" });
      }

      const updatedGameState = await performGameAction(gameState, action);
      const saved = await storage.updateGameState(req.params.id, updatedGameState);
      res.json(saved);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid action" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function performGameAction(gameState: GameState, action: string): Promise<Partial<GameState>> {
  const updates: Partial<GameState> = {};

  switch (action) {
    case 'deal':
      return dealNewGame(gameState);
    
    case 'hit':
      if (!gameState.gameActive) {
        throw new Error("Game is not active");
      }
      return playerHit(gameState);
    
    case 'stand':
      if (!gameState.gameActive) {
        throw new Error("Game is not active");
      }
      return playerStand(gameState);
    
    default:
      throw new Error("Invalid action");
  }
}

function dealNewGame(gameState: GameState): Partial<GameState> {
  // Create new shuffled deck
  const deck = createShuffledDeck();
  
  // Deal initial cards
  const playerHand = [deck.pop()!, deck.pop()!];
  const dealerHand = [deck.pop()!, deck.pop()!];
  
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);
  
  // Check for natural blackjack
  if (playerScore === 21) {
    return {
      deck,
      playerHand,
      dealerHand,
      playerScore,
      dealerScore,
      gameActive: false,
      gameStatus: "Blackjack! Player wins! 🃏",
      wins: gameState.wins + 1,
    };
  }
  
  return {
    deck,
    playerHand,
    dealerHand,
    playerScore,
    dealerScore,
    gameActive: true,
    gameStatus: "Choose your action: Hit or Stand",
  };
}

function playerHit(gameState: GameState): Partial<GameState> {
  const deck = [...gameState.deck];
  const playerHand = [...gameState.playerHand, deck.pop()!];
  const playerScore = calculateScore(playerHand);
  
  if (playerScore > 21) {
    return {
      deck,
      playerHand,
      playerScore,
      gameActive: false,
      gameStatus: "Player Bust! Dealer wins! 💥",
      losses: gameState.losses + 1,
    };
  } else if (playerScore === 21) {
    // Auto-stand on 21
    return playerStand({ ...gameState, deck, playerHand, playerScore });
  }
  
  return {
    deck,
    playerHand,
    playerScore,
    gameStatus: "Choose your action: Hit or Stand",
  };
}

function playerStand(gameState: GameState): Partial<GameState> {
  let deck = [...gameState.deck];
  let dealerHand = [...gameState.dealerHand];
  let dealerScore = calculateScore(dealerHand);
  
  // Dealer must hit on < 17, stand on >= 17
  while (dealerScore < 17) {
    dealerHand.push(deck.pop()!);
    dealerScore = calculateScore(dealerHand);
  }
  
  // Determine winner
  const playerScore = gameState.playerScore;
  let gameStatus: string;
  let wins = gameState.wins;
  let losses = gameState.losses;
  let ties = gameState.ties;
  
  if (dealerScore > 21) {
    gameStatus = "Dealer Bust! Player wins! 🎉";
    wins++;
  } else if (playerScore === dealerScore) {
    gameStatus = "It's a tie! 🤝";
    ties++;
  } else if (playerScore > dealerScore) {
    gameStatus = "Player wins! 🎉";
    wins++;
  } else {
    gameStatus = "Dealer wins! 😔";
    losses++;
  }
  
  return {
    deck,
    dealerHand,
    dealerScore,
    gameActive: false,
    gameStatus,
    wins,
    losses,
    ties,
  };
}

function calculateScore(hand: Card[]): number {
  let score = 0;
  let aces = 0;
  
  for (const card of hand) {
    if (card.value === 'A') {
      aces++;
      score += 11;
    } else {
      score += card.numValue;
    }
  }
  
  // Convert Aces from 11 to 1 if needed
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  
  return score;
}

function createShuffledDeck(): Card[] {
  const suits: Card['suit'][] = ['♠', '♥', '♦', '♣'];
  const values: Card['value'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  // Create full deck
  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        suit,
        value,
        numValue: getCardNumValue(value),
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

function getCardNumValue(value: Card['value']): number {
  if (value === 'A') return 11;
  if (['J', 'Q', 'K'].includes(value)) return 10;
  return parseInt(value);
}
