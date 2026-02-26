import { useRef } from 'react';
import type { GameState, PlayerColor } from '@game1000/common/types';
import './Board.css';

interface BoardProps {
  gameState: GameState;
  onCellClick: (x: number, y: number) => void;
  onCellMouseEnter: (x: number, y: number, top: number, left: number) => void;
  onCellMouseLeave: () => void;
  cellSize: number;
}

export const Board = ({
  gameState,
  onCellClick,
  onCellMouseEnter,
  onCellMouseLeave,
  cellSize,
}: BoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (x: number, y: number) => {
    if (boardRef.current) {
      const { top, left } = boardRef.current.getBoundingClientRect();
      onCellMouseEnter(x, y, top + y * cellSize, left + x * cellSize);
    }
  };

  const boardStyle = {
    gridTemplateColumns: `repeat(20, ${cellSize}px)`,
    gridTemplateRows: `repeat(20, ${cellSize}px)`,
  };

  const cellStyle = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
  };

  return (
    <div className="board" ref={boardRef} onMouseLeave={onCellMouseLeave} style={boardStyle}>
      {gameState.board.map((row: (PlayerColor | null)[], y: number) =>
        row.map((cell: PlayerColor | null, x: number) => (
          <div
            key={`${x}-${y}`}
            className={`cell ${cell || ''}`}
            style={cellStyle}
            onClick={() => onCellClick(x, y)}
            onMouseEnter={() => handleMouseEnter(x, y)}
          />
        ))
      )}
    </div>
  );
};
