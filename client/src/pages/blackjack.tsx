import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type GameState, type GameAction } from "@shared/schema";
import { GameCard } from "../components/game-card";
import { GameStats } from "../components/game-stats";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Blackjack() {
  const [gameId, setGameId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch game state
  const { data: gameState, isLoading } = useQuery<GameState>({
    queryKey: ['/api/game', gameId],
    enabled: !!gameId,
  });

  // Create new game
  const createGameMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/game');
      return res.json();
    },
    onSuccess: (newGame: GameState) => {
      setGameId(newGame.id);
      queryClient.invalidateQueries({ queryKey: ['/api/game'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new game",
        variant: "destructive",
      });
    },
  });

  // Perform game action
  const actionMutation = useMutation({
    mutationFn: async (action: GameAction['action']) => {
      if (!gameId) throw new Error("No active game");
      const res = await apiRequest('POST', `/api/game/${gameId}/action`, { action });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game', gameId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Action failed",
        variant: "destructive",
      });
    },
  });

  const handleAction = (action: GameAction['action']) => {
    actionMutation.mutate(action);
  };

  const startNewGame = () => {
    createGameMutation.mutate();
  };

  // Auto-create game on first load
  if (!gameId && !isLoading && !createGameMutation.isPending) {
    startNewGame();
  }

  if (isLoading || !gameState) {
    return (
      <div className="casino-felt min-h-screen flex items-center justify-center">
        <div className="text-primary text-2xl font-bold">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="casino-felt min-h-screen p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Game Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-primary mb-2">🃏 BLACKJACK 21</h1>
          <p className="text-muted-foreground text-lg">Beat the dealer without going over 21!</p>
        </div>

        {/* Game Table */}
        <div className="game-table rounded-3xl p-8 mb-6">
          
          {/* Game Status Display */}
          <div className="text-center mb-8">
            <div className="score-display inline-block px-6 py-3 rounded-xl">
              <div className="text-xl font-semibold text-foreground" data-testid="game-status">
                {gameState.gameStatus}
              </div>
            </div>
          </div>

          {/* Dealer Section */}
          <div className="mb-12">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-primary mb-2">🎩 DEALER</h2>
              <div className="score-display inline-block px-4 py-2 rounded-lg">
                <span className="text-lg font-semibold text-foreground">
                  Score: <span data-testid="dealer-score">
                    {gameState.gameActive ? '?' : gameState.dealerScore}
                  </span>
                </span>
              </div>
            </div>
            
            {/* Dealer Cards */}
            <div className="flex justify-center items-center gap-4 mb-4" data-testid="dealer-cards">
              {gameState.dealerHand.map((card, index) => (
                <GameCard 
                  key={`dealer-${index}`}
                  card={card}
                  isHidden={gameState.gameActive && index === 1}
                />
              ))}
            </div>
          </div>

          {/* Player Section */}
          <div className="mb-8">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-primary mb-2">👤 PLAYER</h2>
              <div className="score-display inline-block px-4 py-2 rounded-lg">
                <span className="text-lg font-semibold text-foreground">
                  Score: <span data-testid="player-score">{gameState.playerScore}</span>
                </span>
              </div>
            </div>
            
            {/* Player Cards */}
            <div className="flex justify-center items-center gap-4 mb-6" data-testid="player-cards">
              {gameState.playerHand.map((card, index) => (
                <GameCard 
                  key={`player-${index}`}
                  card={card}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <Button 
              onClick={() => handleAction('hit')}
              disabled={!gameState.gameActive || actionMutation.isPending}
              className="btn-primary px-8 py-4 rounded-xl font-semibold text-primary-foreground text-lg hover:scale-105 transition-transform"
              data-testid="button-hit"
            >
              🃏 HIT
            </Button>
            
            <Button 
              onClick={() => handleAction('stand')}
              disabled={!gameState.gameActive || actionMutation.isPending}
              className="btn-secondary px-8 py-4 rounded-xl font-semibold text-foreground text-lg hover:scale-105 transition-transform"
              data-testid="button-stand"
            >
              ✋ STAND
            </Button>
            
            <Button 
              onClick={() => handleAction('deal')}
              disabled={actionMutation.isPending}
              className="btn-primary px-8 py-4 rounded-xl font-semibold text-primary-foreground text-lg hover:scale-105 transition-transform"
              data-testid="button-deal"
            >
              🎯 DEAL
            </Button>
          </div>

          {/* Game Rules Quick Reference */}
          <div className="text-center">
            <details className="score-display inline-block px-6 py-4 rounded-xl text-left max-w-2xl">
              <summary className="font-semibold text-primary cursor-pointer hover:text-accent transition-colors">
                📖 Game Rules
              </summary>
              <div className="mt-4 text-muted-foreground space-y-2 text-sm">
                <p>• <strong>Goal:</strong> Get as close to 21 as possible without going over</p>
                <p>• <strong>Card Values:</strong> 2-10 = face value, J/Q/K = 10, A = 1 or 11</p>
                <p>• <strong>Hit:</strong> Draw another card</p>
                <p>• <strong>Stand:</strong> Keep current hand</p>
                <p>• <strong>Dealer Rules:</strong> Must hit on 16 or less, stand on 17 or more</p>
                <p>• <strong>Win Conditions:</strong> Higher score wins, 21 with 2 cards = Blackjack!</p>
              </div>
            </details>
          </div>
        </div>

        {/* Win/Loss Statistics */}
        <GameStats 
          wins={gameState.wins}
          losses={gameState.losses}
          ties={gameState.ties}
        />
      </div>
    </div>
  );
}
