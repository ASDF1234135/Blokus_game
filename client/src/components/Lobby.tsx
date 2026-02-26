import { useState } from 'react';
import { socket } from '../socket';
import type { GameState } from '@game1000/common/types';
import './Lobby.css';

interface LobbyProps {
  gameId: string | null;
  gameState: GameState | null;
  playerId: string | null;
}

export const Lobby = ({ gameId: gameIdProp, gameState, playerId }: LobbyProps) => {
  const [joinGameId, setJoinGameId] = useState('');

  const handleCreateGame = () => {
    socket.emit('createGame');
  };

  const handleJoinGame = () => {
    if (joinGameId) {
      socket.emit('joinGame', joinGameId);
    }
  };

  const handlePlayerReady = () => {
    const me = gameState?.players.find(p => p.id === playerId);
    if (me) {
      socket.emit('playerReady', !me.isReady);
    }
  };

  const handleStartGame = () => {
    socket.emit('startGame');
  }

  if (gameIdProp && gameState) {
    const me = gameState.players.find(p => p.id === playerId);
    const isGameCreator = gameState.players[0]?.id === playerId;
    const allReady = gameState.players.length > 1 && gameState.players.every(p => p.isReady);

    return (
      <div className="lobby-container">
        <h1>Blokus Online</h1>
        <div className="waiting-lobby">
          <h2>Game ID:</h2>
          <div className="game-id-display">
            <span>{gameIdProp}</span>
            <button onClick={() => navigator.clipboard.writeText(gameIdProp)}>
              Copy
            </button>
          </div>
          <h3>Players:</h3>
          <ul className="player-list">
            {gameState.players.map(p => (
              <li key={p.id} style={{ color: p.color }}>
                {p.id === playerId ? 'You' : p.id} - {p.isReady ? 'Ready' : 'Not Ready'}
              </li>
            ))}
          </ul>
          {me && (
            <button onClick={handlePlayerReady}>
              {me.isReady ? 'Unready' : 'Ready'}
            </button>
          )}
          {isGameCreator && (
            <button onClick={handleStartGame} disabled={!allReady}>
              Start Game
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <h1>Blokus Online</h1>
      <div className="lobby-actions">
        <button onClick={handleCreateGame}>Create New Game</button>
        <div className="join-game">
          <input
            type="text"
            placeholder="Enter Game ID"
            value={joinGameId}
            onChange={(e) => setJoinGameId(e.target.value.trim())}
          />
          <button onClick={handleJoinGame} disabled={!joinGameId}>
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
};
