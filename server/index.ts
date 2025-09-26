import { type GameState, type Card } from "@shared/schema";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      // 處理 /api/game (POST) - 創建新遊戲
      if (url.pathname === "/api/game" && request.method === "POST") {
        const gameState = await createGameState(env);
        return new Response(JSON.stringify(gameState), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST,GET",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      // 處理 /api/game/:id (GET) - 獲取遊戲狀態
      if (url.pathname.startsWith("/api/game/") && request.method === "GET") {
        const id = url.pathname.split("/")[3];
        const gameState = await getGameState(id, env);
        if (!gameState) {
          return new Response(JSON.stringify({ error: "Game not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(gameState), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 處理 /api/game/:id/action (POST) - 遊戲動作
      if (url.pathname.startsWith("/api/game/") && url.pathname.endsWith("/action") && request.method === "POST") {
        const id = url.pathname.split("/")[3];
        const { action } = await request.json();
        const gameState = await getGameState(id, env);
        if (!gameState) {
          return new Response(JSON.stringify({ error: "Game not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        const updatedGameState = await performGameAction(gameState, action);
        const saved = await updateGameState(id, updatedGameState, env);
        return new Response(JSON.stringify(saved), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 靜態檔案：交給 Workers Sites 處理
      return env.ASSETS.fetch(request);
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message || "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

// 移植 storage.ts 的邏輯，改用 KV
async function getGameState(id: string, env: any): Promise<GameState | undefined> {
  const value = await env.KV_GAMES.get(id);
  return value ? JSON.parse(value) : undefined;
}

async function createGameState(env: any): Promise<GameState> {
  const id = crypto.randomUUID(); // 需確認 Workers 支援，或用替代
  const deck = createShuffledDeck();
  const gameState: GameState = {
    id,
    deck,
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
  await env.KV_GAMES.put(id, JSON.stringify(gameState));
  return gameState;
}

async function updateGameState(id: string, updates: Partial<GameState>, env: any): Promise<GameState> {
  const existing = await getGameState(id, env);
  if (!existing) {
    throw new Error(`Game state ${id} not found`);
  }
  const updated = { ...existing, ...updates };
  await env.KV_GAMES.put(id, JSON.stringify(updated));
  return updated;
}

// 移植 routes.ts 的遊戲邏輯
function createShuffledDeck(): Card[] {
  const suits: Card['suit'][] = ['♠', '♥', '♦', '♣'];
  const values: Card['value'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value, numValue: getCardNumValue(value) });
    }
  }
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

async function performGameAction(gameState: GameState, action: string): Promise<Partial<GameState>> {
  switch (action) {
    case 'deal':
      return dealNewGame(gameState);
    case 'hit':
      if (!gameState.gameActive) throw new Error("Game is not active");
      return playerHit(gameState);
    case 'stand':
      if (!gameState.gameActive) throw new Error("Game is not active");
      return playerStand(gameState);
    default:
      throw new Error("Invalid action");
  }
}

function dealNewGame(gameState: GameState): Partial<GameState> {
  const deck = createShuffledDeck();
  const playerHand = [deck.pop()!, deck.pop()!];
  const dealerHand = [deck.pop()!, deck.pop()!];
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);
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
  while (dealerScore < 17) {
    dealerHand.push(deck.pop()!);
    dealerScore = calculateScore(dealerHand);
  }
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
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}