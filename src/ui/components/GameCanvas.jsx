import { useEffect, useRef } from 'react';
import Game from '../../game/Game';

export default function GameCanvas({ nickname, onStatsChange, settings }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const game = new Game(canvas, {
      nickname,
      onStatsChange,
    });

    gameRef.current = game;
    game.start();

    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, [nickname, onStatsChange]);

  useEffect(() => {
    if (!gameRef.current) {
      return;
    }

    gameRef.current.setSettings(settings);
  }, [settings]);

  return <canvas className="game-canvas" ref={canvasRef} />;
}
