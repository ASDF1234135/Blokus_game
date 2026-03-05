import { pieces } from '@game1000/common';
import type { ColorState, Player } from '@game1000/common/types';
import { Piece } from './Piece';
import { useEffect, useState } from 'react';

interface PlayerAreaProps {
  player: Player;
  colorState: ColorState;
  onPieceClick: (piece: keyof typeof pieces) => void;
  isCurrentPlayer: boolean;
  canMove: boolean;
  cellSize: number;
}

export const PlayerArea = ({ player, colorState, onPieceClick, isCurrentPlayer, canMove, cellSize }: PlayerAreaProps) => {
    const [secondsLeft, setSecondsLeft] = useState(60);

    useEffect(() => {
        if (player.status === 'disconnected') {
            const interval = setInterval(() => {
                const timeLeft = Math.round(60 - (Date.now() - (player.disconnectedAt || 0)) / 1000);
                setSecondsLeft(Math.max(0, timeLeft));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [player.status, player.disconnectedAt]);

  return (
    <div className={`player-area ${isCurrentPlayer ? 'current-turn' : ''} ${player.status === 'disconnected' ? 'disconnected' : ''}`}>
      <h3 style={{ color: colorState.color }}>{colorState.color.toUpperCase()}</h3>
      {player.status === 'disconnected' && <div className="reconnecting-notice">Reconnecting... ({secondsLeft}s)</div>}
      {isCurrentPlayer && !canMove && <div className="no-moves-notice">No available moves</div>}
      <div className="pieces-grid">
        {colorState.pieces.map((pieceName) => (
          <div
            key={pieceName}
            onClick={() => onPieceClick(pieceName)}
            className={`piece-container ${isCurrentPlayer && canMove && player.status === 'online' ? 'selectable' : ''}`}
          >
            <Piece piece={pieces[pieceName]} color={colorState.color} cellSize={cellSize * 0.5} />
          </div>
        ))}
      </div>
    </div>
  );
};
