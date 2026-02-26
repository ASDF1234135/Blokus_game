import { useEffect, useState } from 'react';
import { Game } from './components/Game';
import { Lobby } from './components/Lobby';
import { socket } from './socket';
import './App.css';
import type { GameState } from '@game1000/common/types';

function App() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    // Only connect if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    function onGameJoined({ gameId, playerId }: { gameId: string; playerId: string }) {
      setGameId(gameId);
      setPlayerId(playerId);
    }

    function onGameState(state: GameState) {
      console.log('Received gameState update:', state);
      setGameState(state);
    }

    socket.on('gameJoined', onGameJoined);
    socket.on('gameState', onGameState);

    // Cleanup listeners on component unmount
    return () => {
      socket.off('gameJoined', onGameJoined);
      socket.off('gameState', onGameState);
    };
  }, []);

  return (
    <div className="App">
      {gameState?.status === 'in-progress' || gameState?.status === 'finished' ? (
        <Game gameId={gameId!} playerId={playerId!} gameState={gameState} />
      ) : (
        <Lobby gameId={gameId} gameState={gameState} playerId={playerId} />
      )}
    </div>
  );
}

export default App;
