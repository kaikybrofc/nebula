import { memo, useEffect, useRef } from 'react';
import Game from '../../game/Game';

function GameCanvas({ nickname, onStatsChange, settings, onReady }) {
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
    if (onReady) {
      onReady({
        setVirtualDirection: (x, y) => game.setVirtualDirection(x, y),
        triggerSplit: () => game.triggerSplit(),
        setSplitActive: (isActive) => game.setSplitActive(isActive),
        setEjectActive: (isActive) => game.setEjectActive(isActive),
      });
    }
    game.start();

    return () => {
      game.stop();
      if (onReady) {
        onReady(null);
      }
      gameRef.current = null;
    };
  }, [nickname, onReady, onStatsChange]);

  useEffect(() => {
    if (!gameRef.current) {
      return;
    }

    gameRef.current.setSettings(settings);
  }, [settings]);

  return <canvas className="game-canvas" ref={canvasRef} />;
}

export default memo(GameCanvas);
