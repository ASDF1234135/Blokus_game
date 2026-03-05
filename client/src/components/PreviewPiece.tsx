import { pieces } from '@game1000/common';
import type { Piece as PieceType, PlayerColor } from '@game1000/common/types';
import { Piece } from './Piece';
import './PreviewPiece.css';

interface PreviewPieceProps {
  pieceName: keyof typeof pieces;
  color: PlayerColor;
  rotation: 0 | 90 | 180 | 270;
  isFlipped: boolean;
  mouseX: number;
  mouseY: number;
  cellSize: number;
}

export const PreviewPiece = ({
  pieceName,
  color,
  rotation,
  isFlipped,
  mouseX,
  mouseY,
  cellSize,
}: PreviewPieceProps) => {
  const pieceShape = pieces[pieceName];

  function rotate(piece: PieceType): PieceType {
    let rotated: PieceType = piece;
    for (let i = 0; i < rotation / 90; i++) {
      rotated = rotated[0].map((_, colIndex) =>
        rotated.map((row) => row[colIndex]).reverse()
      );
    }
    return rotated;
  }

  function flip(piece: PieceType): PieceType {
    return piece.map((row) => row.slice().reverse());
  }

  let finalPiece = isFlipped ? flip(pieceShape) : pieceShape;
  finalPiece = rotate(finalPiece);

  return (
    <div
      className="preview-piece"
      style={{
        left: mouseX,
        top: mouseY,
      }}
    >
      <Piece piece={finalPiece} color={color} cellSize={cellSize} />
    </div>
  );
};
