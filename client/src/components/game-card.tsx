import { type Card } from "@shared/schema";

interface GameCardProps {
  card: Card;
  isHidden?: boolean;
}

export function GameCard({ card, isHidden = false }: GameCardProps) {
  if (isHidden) {
    return (
      <div className="card-back w-24 h-36 rounded-lg flex items-center justify-center card-deal" data-testid="card-hidden">
        <div className="text-white text-4xl">🂠</div>
      </div>
    );
  }

  const isRed = ['♥', '♦'].includes(card.suit);
  const suitClass = isRed ? 'suit-red' : 'suit-black';

  return (
    <div className="card w-24 h-36 rounded-lg flex flex-col items-center justify-center relative card-deal" data-testid={`card-${card.value}-${card.suit}`}>
      <div className={`text-2xl font-bold ${suitClass}`}>{card.value}</div>
      <div className="text-3xl">{card.suit}</div>
      <div className={`absolute top-1 left-1 text-xs font-bold ${suitClass}`}>{card.value}</div>
      <div className={`absolute bottom-1 right-1 text-xs font-bold ${suitClass} transform rotate-180`}>{card.value}</div>
    </div>
  );
}
