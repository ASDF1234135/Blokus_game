import { useEffect, useState } from 'react';
import { Game } from './components/Game';
import { Lobby } from './components/Lobby';
import { socket } from './socket';
import './App.css';
import type { GameState } from '@game1000/common/types';

// Function to get or create a persistent player ID
const getPersistentPlayerId = (): string => {
  let pid = localStorage.getItem('playerId');
  if (!pid) {
    pid = Math.random().toString(36).substring(2, 9);
    localStorage.setItem('playerId', pid);
  }
  return pid;
};


function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(getPersistentPlayerId());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isKicked, setKicked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function onGameJoined({ gameId, playerId: serverPlayerId }: { gameId: string; playerId: string }) {
      setGameId(gameId);
      // The server will confirm our persistent ID
      setPlayerId(serverPlayerId);
      localStorage.setItem('gameId', gameId);
    }

    function onGameState(state: GameState) {
      console.log('Received gameState update:', state);
      setGameState(state);
      setIsLoading(false);
    }

    function onDuplicateConnection() {
        setKicked(true);
        setIsLoading(false);
    }

    function onError(message: string) {
        console.error(message);
        localStorage.removeItem('gameId');
        setIsLoading(false);
    }

    function onGameEnded(message: string) {
        alert(message);
        localStorage.removeItem('gameId');
        window.location.reload();
    }

    function onGameLeft() {
        setGameId(null);
        setGameState(null);
        localStorage.removeItem('gameId');
    }

    socket.on('gameJoined', onGameJoined);
    socket.on('gameState', onGameState);
    socket.on('duplicateConnection', onDuplicateConnection);
    socket.on('error', onError);
    socket.on('gameEnded', onGameEnded);
    socket.on('gameLeft', onGameLeft);

    // Attempt to rejoin if session data is available
    const storedGameId = localStorage.getItem('gameId');
    const persistentPlayerId = getPersistentPlayerId();
    if (storedGameId && persistentPlayerId) {
      socket.connect();
      socket.emit('rejoinGame', { gameId: storedGameId, playerId: persistentPlayerId });
    } else {
        setIsLoading(false);
    }


    return () => {
      socket.off('gameJoined', onGameJoined);
      socket.off('gameState', onGameState);
      socket.off('duplicateConnection', onDuplicateConnection);
      socket.off('error', onError);
      socket.off('gameEnded', onGameEnded);
      socket.off('gameLeft', onGameLeft);
    };
  }, []);

  if (isKicked) {
    return (
        <div className="kicked-overlay">
            <h1>Connection Replaced</h1>
            <p>You have been disconnected because the game was opened in another window or tab.</p>
        </div>
    )
  }

  if (isLoading) {
    return (
        <div className="loading-overlay">
            <h1>Reconnecting to your game...</h1>
        </div>
    );
  }

  return (
    <div className="App">
      {gameState?.status === 'in-progress' || gameState?.status === 'finished' ? (
        <Game playerId={playerId!} gameState={gameState} />
      ) : (
        <Lobby gameId={gameId} gameState={gameState} playerId={playerId} />
      )}
    </div>
  );
}

export default App;
