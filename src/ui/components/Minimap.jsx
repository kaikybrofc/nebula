import { useEffect, useRef } from 'react';

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

export default function Minimap({ stats, size = 140, compact = false }) {
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

    const mapSize = size;
    const x = stats.playerX / Math.max(1, stats.worldWidth);
    const y = stats.playerY / Math.max(1, stats.worldHeight);
    const px = Math.max(0, Math.min(mapSize, x * mapSize));
    const py = Math.max(0, Math.min(mapSize, y * mapSize));

    ctx.clearRect(0, 0, mapSize, mapSize);
    ctx.fillStyle = 'rgba(5, 10, 18, 0.86)';
    ctx.fillRect(0, 0, mapSize, mapSize);
    drawGrid(ctx, mapSize);

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, mapSize - 2, mapSize - 2);

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(px, py, 4.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(139, 92, 246, 0.6)';
    ctx.beginPath();
    ctx.arc(px, py, 8.5, 0, Math.PI * 2);
    ctx.fill();
  }, [size, stats.playerX, stats.playerY, stats.worldHeight, stats.worldWidth]);

  return (
    <section className={`ui-card minimap-panel ${compact ? 'is-compact' : ''}`.trim()} aria-label="Minimap">
      <canvas ref={canvasRef} width={size} height={size} />
    </section>
  );
}
