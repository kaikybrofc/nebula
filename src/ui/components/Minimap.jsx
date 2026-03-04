import { useEffect, useRef } from 'react';

const MAP_SIZE = 140;

function drawGrid(ctx, size) {
  ctx.strokeStyle = 'rgba(229, 231, 235, 0.18)';
  ctx.lineWidth = 1;
  const step = size / 4;

  for (let i = 1; i < 4; i += 1) {
    const pos = step * i;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }
}

export default function Minimap({ stats }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const size = MAP_SIZE;
    const x = stats.playerX / Math.max(1, stats.worldWidth);
    const y = stats.playerY / Math.max(1, stats.worldHeight);
    const px = Math.max(0, Math.min(size, x * size));
    const py = Math.max(0, Math.min(size, y * size));

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(5, 10, 18, 0.86)';
    ctx.fillRect(0, 0, size, size);
    drawGrid(ctx, size);

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(px, py, 4.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
    ctx.beginPath();
    ctx.arc(px, py, 8.5, 0, Math.PI * 2);
    ctx.fill();
  }, [stats.playerX, stats.playerY, stats.worldHeight, stats.worldWidth]);

  return (
    <section className="ui-card minimap-panel" aria-label="Minimap">
      <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} />
    </section>
  );
}
