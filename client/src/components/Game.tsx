import { useEffect, useState } from 'react';
import { socket } from '../socket';
import { pieces } from '@game1000/common';
import type { GameState, PlacedPiece, ColorState, PlayerColor, Player } from '@game1000/common/types';
import { Board } from './Board';
import { PlayerArea } from './PlayerArea';
import { PreviewPiece } from './PreviewPiece';
import { GameOver } from './GameOver';
import { Modal } from './Modal';
import { canPlace } from '../games/blokus';
import './Board.css';
import './PlayerArea.css';

interface GameProps {
  playerId: string;
  gameState: GameState;
}

interface SelectedPiece {
    name: keyof typeof pieces;
    color: PlayerColor;
}

export const Game = ({ playerId, gameState }: GameProps) => {
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece | null>(null);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [previewX, setPreviewX] = useState(0);
  const [previewY, setPreviewY] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [canMove, setCanMove] = useState(true);
  const [showNoMovesModal, setShowNoMovesModal] = useState(false);
  const [cellSize, setCellSize] = useState(30);

  const currentColor = gameState.colors[gameState.currentPlayerIndex];
  
  let isMyTurn = false;
  if (currentColor) {
    if (gameState.gameType === '3-player' && currentColor.playerId === 'shared') {
        isMyTurn = gameState.players[gameState.sharedColorPlayerIndex!].id === playerId;
    } else {
        isMyTurn = currentColor.playerId === playerId;
    }
  }

  const getPlayerForColor = (colorState: ColorState): Player | undefined => {
    if (colorState.playerId === 'shared') {
        if (gameState.sharedColorPlayerIndex !== undefined) {
            return gameState.players[gameState.sharedColorPlayerIndex];
        }
        return undefined;
    }
    return gameState.players.find(p => p.id === colorState.playerId);
  }

  const getTurnPrompt = () => {
    if (!currentColor) return '';

    const colorName = currentColor.color.toUpperCase();
    if (isMyTurn) {
        return `Your Turn (${colorName})`;
    }

    const player = getPlayerForColor(currentColor);
    if (player) {
        return `${player.id}'s Turn (${colorName})`;
    }
    
    return `Player's Turn (${colorName})`;
  };
  
  useEffect(() => {
    const updateCellSize = () => {
      const size = Math.min(window.innerWidth / 40, window.innerHeight / 25);
      setCellSize(size);
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  useEffect(() => {
    if (!isMyTurn) {
        setSelectedPiece(null);
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (isMyTurn && currentColor) {
      let hasMove = false;
      for (const pieceName of currentColor.pieces) {
        if (canPlace(gameState.board, currentColor.color, pieces[pieceName])) {
          hasMove = true;
          break;
        }
      }
      setCanMove(hasMove);
      if (!hasMove) {
        setShowNoMovesModal(true);
      }
    } else {
      setCanMove(true);
      setShowNoMovesModal(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'r') setRotation(prev => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
      if (e.key === 'f') setIsFlipped(prev => !prev);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, playerId, isMyTurn, currentColor]);

  const handlePlacePiece = (x: number, y: number) => {
    if (selectedPiece && isMyTurn && canMove) {
      const placedPiece: PlacedPiece = { piece: selectedPiece.name, x, y, rotation, isFlipped };
      socket.emit('placePiece', placedPiece);
      setSelectedPiece(null);
      setRotation(0);
      setIsFlipped(false);
    }
  };

  const handlePassTurn = () => {
    if (isMyTurn) {
      socket.emit('passTurn');
      setShowNoMovesModal(false);
    }
  };

  if (gameState.status === 'finished') {
    return <GameOver gameState={gameState} playerId={playerId} />;
  }
  
  if (!currentColor) {
    return <div>Loading...</div>;
  }

  return (
    <div className="game-container">
      <Modal
        show={showNoMovesModal}
        title="No Available Moves"
        footer={<button onClick={handlePassTurn}>Pass Turn</button>}
      >
        <p>You have no available moves with your remaining pieces. You must pass your turn.</p>
      </Modal>

      {selectedPiece && showPreview && <PreviewPiece pieceName={selectedPiece.name} color={selectedPiece.color} rotation={rotation} isFlipped={isFlipped} mouseX={previewX} mouseY={previewY} cellSize={cellSize} />}
      
      <div className="player-column-left">
        {[gameState.colors[0], gameState.colors[2]].map((colorState: ColorState) => {
            const player = getPlayerForColor(colorState);
            return colorState && player && (
                <PlayerArea
                key={colorState.color}
                player={player}
                colorState={colorState}
                onPieceClick={(piece) => {
                    if (isMyTurn && canMove && colorState.color === currentColor.color) {
                    setSelectedPiece({ name: piece, color: colorState.color });
                    }
                }}
                isCurrentPlayer={colorState.color === currentColor.color}
                canMove={canMove}
                cellSize={cellSize}
                />
            )
        })}
      </div>

      <div className="board-container">
        <div className="game-info">
          <h1>Blokus</h1>
          <h3>{getTurnPrompt()}</h3>
          {isMyTurn && <button onClick={handlePassTurn}>Pass Turn</button>}
          <p className="controls-hint">Press 'R' to rotate, 'F' to flip</p>
        </div>
        <Board
          gameState={gameState}
          onCellClick={handlePlacePiece}
          onCellMouseEnter={(_x, _y, top, left) => {
            setPreviewX(left);
            setPreviewY(top);
            setShowPreview(true);
          }}
          onCellMouseLeave={() => setShowPreview(false)}
          cellSize={cellSize}
        />
      </div>

      <div className="player-column-right">
        {[gameState.colors[1], gameState.colors[3]].map((colorState: ColorState) => {
            const player = getPlayerForColor(colorState);
            return colorState && player && (
                <PlayerArea
                key={colorState.color}
                player={player}
                colorState={colorState}
                onPieceClick={(piece) => {
                    if (isMyTurn && canMove && colorState.color === currentColor.color) {
                    setSelectedPiece({ name: piece, color: colorState.color });
                    }
                }}
                isCurrentPlayer={colorState.color === currentColor.color}
                canMove={canMove}
                cellSize={cellSize}
                />
            )
        })}
      </div>
    </div>
  );
};
