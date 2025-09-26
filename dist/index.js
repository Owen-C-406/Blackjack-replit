// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  gameStates;
  constructor() {
    this.gameStates = /* @__PURE__ */ new Map();
  }
  async getGameState(id) {
    return this.gameStates.get(id);
  }
  async createGameState() {
    const id = randomUUID();
    const gameState = {
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
      ties: 0
    };
    this.gameStates.set(id, gameState);
    return gameState;
  }
  async updateGameState(id, updates) {
    const existing = this.gameStates.get(id);
    if (!existing) {
      throw new Error(`Game state ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.gameStates.set(id, updated);
    return updated;
  }
  createShuffledDeck() {
    const suits = ["\u2660", "\u2665", "\u2666", "\u2663"];
    const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const deck = [];
    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          suit,
          value,
          numValue: this.getCardNumValue(value)
        });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  getCardNumValue(value) {
    if (value === "A") return 11;
    if (["J", "Q", "K"].includes(value)) return 10;
    return parseInt(value);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { z } from "zod";
var cardSchema = z.object({
  suit: z.enum(["\u2660", "\u2665", "\u2666", "\u2663"]),
  value: z.enum(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]),
  numValue: z.number().min(1).max(11)
});
var gameStateSchema = z.object({
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
  ties: z.number()
});
var gameActionSchema = z.object({
  action: z.enum(["deal", "hit", "stand"])
});

// server/routes.ts
async function registerRoutes(app2) {
  app2.post("/api/game", async (req, res) => {
    try {
      const gameState = await storage.createGameState();
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to create game" });
    }
  });
  app2.get("/api/game/:id", async (req, res) => {
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
  app2.post("/api/game/:id/action", async (req, res) => {
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
  const httpServer = createServer(app2);
  return httpServer;
}
async function performGameAction(gameState, action) {
  const updates = {};
  switch (action) {
    case "deal":
      return dealNewGame(gameState);
    case "hit":
      if (!gameState.gameActive) {
        throw new Error("Game is not active");
      }
      return playerHit(gameState);
    case "stand":
      if (!gameState.gameActive) {
        throw new Error("Game is not active");
      }
      return playerStand(gameState);
    default:
      throw new Error("Invalid action");
  }
}
function dealNewGame(gameState) {
  const deck = createShuffledDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];
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
      gameStatus: "Blackjack! Player wins! \u{1F0CF}",
      wins: gameState.wins + 1
    };
  }
  return {
    deck,
    playerHand,
    dealerHand,
    playerScore,
    dealerScore,
    gameActive: true,
    gameStatus: "Choose your action: Hit or Stand"
  };
}
function playerHit(gameState) {
  const deck = [...gameState.deck];
  const playerHand = [...gameState.playerHand, deck.pop()];
  const playerScore = calculateScore(playerHand);
  if (playerScore > 21) {
    return {
      deck,
      playerHand,
      playerScore,
      gameActive: false,
      gameStatus: "Player Bust! Dealer wins! \u{1F4A5}",
      losses: gameState.losses + 1
    };
  } else if (playerScore === 21) {
    return playerStand({ ...gameState, deck, playerHand, playerScore });
  }
  return {
    deck,
    playerHand,
    playerScore,
    gameStatus: "Choose your action: Hit or Stand"
  };
}
function playerStand(gameState) {
  let deck = [...gameState.deck];
  let dealerHand = [...gameState.dealerHand];
  let dealerScore = calculateScore(dealerHand);
  while (dealerScore < 17) {
    dealerHand.push(deck.pop());
    dealerScore = calculateScore(dealerHand);
  }
  const playerScore = gameState.playerScore;
  let gameStatus;
  let wins = gameState.wins;
  let losses = gameState.losses;
  let ties = gameState.ties;
  if (dealerScore > 21) {
    gameStatus = "Dealer Bust! Player wins! \u{1F389}";
    wins++;
  } else if (playerScore === dealerScore) {
    gameStatus = "It's a tie! \u{1F91D}";
    ties++;
  } else if (playerScore > dealerScore) {
    gameStatus = "Player wins! \u{1F389}";
    wins++;
  } else {
    gameStatus = "Dealer wins! \u{1F614}";
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
    ties
  };
}
function calculateScore(hand) {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.value === "A") {
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
function createShuffledDeck() {
  const suits = ["\u2660", "\u2665", "\u2666", "\u2663"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        suit,
        value,
        numValue: getCardNumValue(value)
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function getCardNumValue(value) {
  if (value === "A") return 11;
  if (["J", "Q", "K"].includes(value)) return 10;
  return parseInt(value);
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions = {
    port,
    host: "127.0.0.1"
  };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }
  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
