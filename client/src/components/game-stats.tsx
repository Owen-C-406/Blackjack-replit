interface GameStatsProps {
  wins: number;
  losses: number;
  ties: number;
}

export function GameStats({ wins, losses, ties }: GameStatsProps) {
  return (
    <div className="flex justify-center gap-8 text-center">
      <div className="score-display px-6 py-4 rounded-xl">
        <div className="text-2xl font-bold text-emerald-400" data-testid="stat-wins">{wins}</div>
        <div className="text-sm text-muted-foreground">Wins</div>
      </div>
      <div className="score-display px-6 py-4 rounded-xl">
        <div className="text-2xl font-bold text-destructive" data-testid="stat-losses">{losses}</div>
        <div className="text-sm text-muted-foreground">Losses</div>
      </div>
      <div className="score-display px-6 py-4 rounded-xl">
        <div className="text-2xl font-bold text-amber-400" data-testid="stat-ties">{ties}</div>
        <div className="text-sm text-muted-foreground">Ties</div>
      </div>
    </div>
  );
}
