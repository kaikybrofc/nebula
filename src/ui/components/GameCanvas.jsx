import { useEffect, useRef } from 'react';
import Game from '../../game/Game';

export default function GameCanvas({ nickname, onStatsChange }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const game = new Game(canvas, {
      nickname,
      onStatsChange,
    });

    game.start();

    return () => {
      game.stop();
    };
  }, [nickname, onStatsChange]);

  return <canvas className="game-canvas" ref={canvasRef} />;
}
