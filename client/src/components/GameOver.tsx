import { pieces } from '@game1000/common';
import type { GameState, Player } from '@game1000/common/types';
import { socket } from '../socket';
import './GameOver.css';

interface GameOverProps {
  gameState: GameState;
  playerId: string;
}

export const GameOver = ({ gameState, playerId }: GameOverProps) => {
  const rankedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  const handlePlayAgain = () => {
    socket.emit('playAgainRequest');
  };

  const me = gameState.players.find(p => p.id === playerId);

  return (
    <div className="game-over-container">
      <h1>Game Over!</h1>
      <h2>Final Rankings</h2>
      <ol className="ranking-list">
        {rankedPlayers.map((player: Player, index: number) => (
          <li key={player.id} className={player.id === playerId ? 'current-player' : ''}>
            <span className="rank">{index + 1}.</span>
            <span className="player-color" style={{ color: player.color }}>
              {player.color.toUpperCase()} {player.id === playerId && '(You)'}
            </span>
            <span className="score">Score: {player.score}</span>
            {player.wantsToPlayAgain && <span className="play-again-status">Wants to play again!</span>}
          </li>
        ))}
      </ol>
      <div className="game-over-actions">
        {!me?.wantsToPlayAgain && <button onClick={handlePlayAgain}>Play Again</button>}
        <button onClick={() => window.location.reload()}>End Game</button>
      </div>
    </div>
  );
};
