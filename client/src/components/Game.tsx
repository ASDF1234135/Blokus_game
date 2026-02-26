import { useEffect, useState } from 'react';
import { socket } from '../socket';
import { pieces } from '@game1000/common';
import type { GameState, PlacedPiece, Player } from '@game1000/common/types';
import { Board } from './Board';
import { PlayerArea } from './PlayerArea';
import { PreviewPiece } from './PreviewPiece';
import { GameOver } from './GameOver';
import { Modal } from './Modal';
import { canPlace } from '../games/blokus';
import './Board.css';
import './PlayerArea.css';

interface GameProps {
  gameId: string;
  playerId: string;
  gameState: GameState;
}

export const Game = ({ gameId, playerId, gameState }: GameProps) => {
  const [selectedPiece, setSelectedPiece] = useState<keyof typeof pieces | null>(null);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [previewX, setPreviewX] = useState(0);
  const [previewY, setPreviewY] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [canMove, setCanMove] = useState(true);
  const [showNoMovesModal, setShowNoMovesModal] = useState(false);
  const [cellSize, setCellSize] = useState(30);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer.id === playerId;
  
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
    if (isMyTurn) {
      const me = gameState.players.find(p => p.id === playerId);
      if (me) {
        let hasMove = false;
        for (const pieceName of me.pieces) {
          if (canPlace(gameState.board, me.color, pieces[pieceName])) {
            hasMove = true;
            break;
          }
        }
        setCanMove(hasMove);
        if (!hasMove) {
          setShowNoMovesModal(true);
        }
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
  }, [gameState, playerId, isMyTurn]);

  const handlePlacePiece = (x: number, y: number) => {
    if (selectedPiece && isMyTurn && canMove) {
      const placedPiece: PlacedPiece = { piece: selectedPiece, x, y, rotation, isFlipped };
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

  return (
    <div className="game-container">
      <Modal
        show={showNoMovesModal}
        title="No Available Moves"
        footer={<button onClick={handlePassTurn}>Pass Turn</button>}
      >
        <p>You have no available moves with your remaining pieces. You must pass your turn.</p>
      </Modal>

      {selectedPiece && showPreview && <PreviewPiece pieceName={selectedPiece} rotation={rotation} isFlipped={isFlipped} mouseX={previewX} mouseY={previewY} cellSize={cellSize} />}
      
      <div className="player-column-left">
        {[gameState.players[0], gameState.players[2]].map((player: Player) => 
          player && (
            <PlayerArea
              key={player.id}
              player={player}
              onPieceClick={(piece) => {
                if (isMyTurn && canMove && player.id === playerId) {
                  setSelectedPiece(piece);
                }
              }}
              isCurrentPlayer={player.id === currentPlayer.id}
              canMove={canMove}
              cellSize={cellSize}
            />
          )
        )}
      </div>

      <div className="board-container">
        <div className="game-info">
          <h1>Blokus</h1>
          <h3>Current Player: <span style={{ color: currentPlayer.color }}>{currentPlayer.color.toUpperCase()}</span> ({isMyTurn ? 'You' : ''})</h3>
          {isMyTurn && <button onClick={handlePassTurn}>Pass Turn</button>}
          <p className="controls-hint">Press 'R' to rotate, 'F' to flip</p>
        </div>
        <Board
          gameState={gameState}
          onCellClick={handlePlacePiece}
          onCellMouseEnter={(x, y, top, left) => {
            setPreviewX(left);
            setPreviewY(top);
            setShowPreview(true);
          }}
          onCellMouseLeave={() => setShowPreview(false)}
          selectedPiece={selectedPiece}
          rotation={rotation}
          isFlipped={isFlipped}
          cellSize={cellSize}
        />
      </div>

      <div className="player-column-right">
        {[gameState.players[1], gameState.players[3]].map((player: Player) => 
          player && (
            <PlayerArea
              key={player.id}
              player={player}
              onPieceClick={(piece) => {
                if (isMyTurn && canMove && player.id === playerId) {
                  setSelectedPiece(piece);
                }
              }}
              isCurrentPlayer={player.id === currentPlayer.id}
              canMove={canMove}
              cellSize={cellSize}
            />
          )
        )}
      </div>
    </div>
  );
};
