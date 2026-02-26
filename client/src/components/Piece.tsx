import type { Piece as PieceType } from '@game1000/common/types';
import './Piece.css';

interface PieceProps {
  piece: PieceType;
  color?: string;
  cellSize: number;
}

export const Piece = ({ piece, color, cellSize }: PieceProps) => {
  const gridStyle = {
    gridTemplateRows: `repeat(${piece.length}, ${cellSize}px)`,
    gridTemplateColumns: `repeat(${piece[0].length}, ${cellSize}px)`,
  };

  return (
    <div className="piece" style={gridStyle}>
      {piece.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <div
              key={`${x}-${y}`}
              className="piece-cell"
              style={{
                backgroundColor: color || 'rgba(0,0,0,0.5)',
                width: `${cellSize}px`,
                height: `${cellSize}px`,
              }}
            />
          ) : (
            <div key={`${x}-${y}`} />
          )
        )
      )}
    </div>
  );
};
