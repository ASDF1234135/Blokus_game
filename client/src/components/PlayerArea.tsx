import { pieces } from '@game1000/common';
import type { ColorState } from '@game1000/common/types';
import { Piece } from './Piece';

interface PlayerAreaProps {
  colorState: ColorState;
  onPieceClick: (piece: keyof typeof pieces) => void;
  isCurrentPlayer: boolean;
  canMove: boolean;
  cellSize: number;
}

export const PlayerArea = ({ colorState, onPieceClick, isCurrentPlayer, canMove, cellSize }: PlayerAreaProps) => {
  return (
    <div className={`player-area ${isCurrentPlayer ? 'current-turn' : ''}`}>
      <h3 style={{ color: colorState.color }}>{colorState.color.toUpperCase()}</h3>
      {isCurrentPlayer && !canMove && <div className="no-moves-notice">No available moves</div>}
      <div className="pieces-grid">
        {colorState.pieces.map((pieceName) => (
          <div
            key={pieceName}
            onClick={() => onPieceClick(pieceName)}
            className={`piece-container ${isCurrentPlayer && canMove ? 'selectable' : ''}`}
          >
            <Piece piece={pieces[pieceName]} color={colorState.color} cellSize={cellSize * 0.5} />
          </div>
        ))}
      </div>
    </div>
  );
};
