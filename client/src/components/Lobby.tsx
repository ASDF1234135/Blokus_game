import { useState } from 'react';
import { socket } from '../socket';
import type { GameState, GameType } from '@game1000/common/types';
import { Modal } from './Modal';
import './Lobby.css';

interface LobbyProps {
  gameId: string | null;
  gameState: GameState | null;
  playerId: string | null;
}

export const Lobby = ({ gameId: gameIdProp, gameState, playerId }: LobbyProps) => {
  const [joinGameId, setJoinGameId] = useState('');
  const [gameType, setGameType] = useState<GameType>('4-player');
  const [showRules, setShowRules] = useState(false);

  const handleCreateGame = () => {
    socket.emit('createGame', { gameType, playerId });
  };

  const handleJoinGame = () => {
    if (joinGameId) {
      socket.emit('joinGame', { gameId: joinGameId, playerId });
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

  const handleLeaveLobby = () => {
    socket.emit('leaveLobby');
  }

  if (gameIdProp && gameState) {
    const me = gameState.players.find(p => p.id === playerId);
    const isGameCreator = gameState.players[0]?.id === playerId;
    const minPlayers = gameState.gameType === '2-player' ? 2 : gameState.gameType === '3-player' ? 3 : 4;
    const allReady = gameState.players.length >= minPlayers && gameState.players.every(p => p.isReady);

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
          <h3>Players: ({gameState.players.length}/{gameState.gameType === '2-player' ? 2 : gameState.gameType === '3-player' ? 3 : 4})</h3>
          <ul className="player-list">
            {gameState.players.map(p => (
              <li key={p.id}>
                {p.id === playerId ? 'You' : p.id} - {p.isReady ? 'Ready' : 'Not Ready'}
              </li>
            ))}
          </ul>
          <div className="lobby-buttons">
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
            <button onClick={handleLeaveLobby} className="leave-button">Leave Game</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
        <Modal show={showRules} title="How to Play Blokus" footer={<button onClick={() => setShowRules(false)}>Close</button>}>
            <h3>Game Rules</h3>
            <p>The goal of Blokus is to place as many of your pieces on the board as possible.</p>
            <h4>Placement Rules:</h4>
            <ul>
                <li><strong>First Piece:</strong> Your first piece must cover one of the four corners of the board.</li>
                <li><strong>Subsequent Pieces:</strong> Each new piece you place must touch at least one of your previously played pieces, but only at the corners. Your pieces of the same color cannot touch along an edge.</li>
                <li>There are no restrictions on how your pieces touch an opponent's pieces.</li>
            </ul>
            {/* Placeholder for images */}
            <p><em>[Image of a valid first move]</em></p>
            <p><em>[Image of a valid subsequent move]</em></p>
            <p><em>[Image of an invalid move]</em></p>
        </Modal>

      <h1>Blokus Online</h1>
      <div className="lobby-actions">
        <div>
          <h2>Select Number of Players</h2>
          <button className={gameType === '2-player' ? 'active' : ''} onClick={() => setGameType('2-player')}>2 Players</button>
          <button className={gameType === '3-player' ? 'active' : ''} onClick={() => setGameType('3-player')}>3 Players</button>
          <button className={gameType === '4-player' ? 'active' : ''} onClick={() => setGameType('4-player')}>4 Players</button>
        </div>
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
        <button className="rules-button" onClick={() => setShowRules(true)}>How to Play?</button>
      </div>
    </div>
  );
};
