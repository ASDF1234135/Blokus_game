import { pieces } from '@game1000/common';
import type { Player } from '@game1000/common/types';
import { Piece } from './Piece';

interface PlayerAreaProps {
  player: Player;
  onPieceClick: (piece: keyof typeof pieces) => void;
  isCurrentPlayer: boolean;
  canMove: boolean;
  cellSize: number;
}

export const PlayerArea = ({ player, onPieceClick, isCurrentPlayer, canMove, cellSize }: PlayerAreaProps) => {
  return (
    <div className={`player-area ${isCurrentPlayer ? 'current-turn' : ''}`}>
      <h3 style={{ color: player.color }}>{player.color.toUpperCase()}</h3>
      {isCurrentPlayer && !canMove && <div className="no-moves-notice">No available moves</div>}
      <div className="pieces-grid">
        {player.pieces.map((pieceName) => (
          <div
            key={pieceName}
            onClick={() => onPieceClick(pieceName)}
            className={`piece-container ${isCurrentPlayer && canMove ? 'selectable' : ''}`}
          >
            <Piece piece={pieces[pieceName]} color={player.color} cellSize={cellSize * 0.5} />
          </div>
        ))}
      </div>
    </div>
  );
};

