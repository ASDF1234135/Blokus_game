import type { GameState, Player } from '@game1000/common/types';
import { socket } from '../socket';
import './GameOver.css';

interface GameOverProps {
  gameState: GameState;
  playerId: string;
}

interface PlayerScore {
  player: Player;
  score: number;
  wantsToPlayAgain: boolean;
}

export const GameOver = ({ gameState, playerId }: GameOverProps) => {

  const calculateScores = (): PlayerScore[] => {
    if (gameState.gameType === '2-player') {
      return gameState.players.map(p => {
        const score = gameState.colors
          .filter(c => c.playerId === p.id)
          .reduce((acc, c) => acc + c.score, 0);
        return { player: p, score, wantsToPlayAgain: p.wantsToPlayAgain };
      });
    } else {
      // 3-player and 4-player
      return gameState.players.map(p => {
        const colorState = gameState.colors.find(c => c.playerId === p.id);
        return { player: p, score: colorState?.score || 0, wantsToPlayAgain: p.wantsToPlayAgain };
      });
    }
  };

  const rankedPlayers = calculateScores().sort((a, b) => b.score - a.score);

  const handlePlayAgain = () => {
    socket.emit('playAgainRequest');
  };

  const me = gameState.players.find(p => p.id === playerId);

  return (
    <div className="game-over-container">
      <h1>Game Over!</h1>
      <h2>Final Rankings</h2>
      <ol className="ranking-list">
        {rankedPlayers.map((playerScore: PlayerScore, index: number) => (
          <li key={playerScore.player.id} className={playerScore.player.id === playerId ? 'current-player' : ''}>
            <span className="rank">{index + 1}.</span>
            <span className="player-id">
              {playerScore.player.id === playerId ? 'You' : playerScore.player.id}
            </span>
            <span className="score">Score: {playerScore.score}</span>
            {playerScore.wantsToPlayAgain && <span className="play-again-status">Wants to play again!</span>}
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
