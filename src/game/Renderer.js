import { RENDER_CONFIG } from '../shared/config';

export default class Renderer {
  constructor(canvas, context, camera, world) {
    this.canvas = canvas;
    this.context = context;
    this.camera = camera;
    this.world = world;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
  }

  resize(width, height, dpr = 1) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(player) {
    const ctx = this.context;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = RENDER_CONFIG.background;
    ctx.fillRect(0, 0, this.width, this.height);

    // World render in camera space: screen center -> zoom -> world origin.
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.drawWorldFill();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.world.width, this.world.height);
    ctx.clip();

    const viewBounds = this.camera.getViewBounds(120);
    this.drawGrid(viewBounds);
    this.drawFood(viewBounds);
    this.drawPlayer(player);

    ctx.restore();
    this.drawWorldBorder();
    ctx.restore();
  }

  drawWorldFill() {
    const ctx = this.context;

    ctx.fillStyle = RENDER_CONFIG.worldFill;
    ctx.fillRect(0, 0, this.world.width, this.world.height);
  }

  drawWorldBorder() {
    const ctx = this.context;

    ctx.lineWidth = 4 / this.camera.zoom;
    ctx.strokeStyle = RENDER_CONFIG.worldBorder;
    ctx.strokeRect(0, 0, this.world.width, this.world.height);
  }

  drawGrid(bounds) {
    const ctx = this.context;
    const gridSize = RENDER_CONFIG.gridSize;
    const majorStep = gridSize * 5;
    const startX = Math.floor(bounds.left / gridSize) * gridSize;
    const endX = Math.ceil(bounds.right / gridSize) * gridSize;
    const startY = Math.floor(bounds.top / gridSize) * gridSize;
    const endY = Math.ceil(bounds.bottom / gridSize) * gridSize;

    ctx.lineWidth = 1 / this.camera.zoom;

    for (let x = startX; x <= endX; x += gridSize) {
      const isMajor = x % majorStep === 0;
      ctx.strokeStyle = isMajor ? RENDER_CONFIG.gridMajor : RENDER_CONFIG.gridMinor;
      ctx.beginPath();
      ctx.moveTo(x, bounds.top);
      ctx.lineTo(x, bounds.bottom);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      const isMajor = y % majorStep === 0;
      ctx.strokeStyle = isMajor ? RENDER_CONFIG.gridMajor : RENDER_CONFIG.gridMinor;
      ctx.beginPath();
      ctx.moveTo(bounds.left, y);
      ctx.lineTo(bounds.right, y);
      ctx.stroke();
    }
  }

  drawFood(bounds) {
    const ctx = this.context;

    for (let index = 0; index < this.world.food.length; index += 1) {
      const food = this.world.food[index];

      if (
        food.x + food.radius < bounds.left ||
        food.x - food.radius > bounds.right ||
        food.y + food.radius < bounds.top ||
        food.y - food.radius > bounds.bottom
      ) {
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = food.color;
      ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(player) {
    const ctx = this.context;

    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.strokeStyle = player.strokeColor;
    ctx.lineWidth = 6 / this.camera.zoom;
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.arc(
      player.x - player.radius * 0.32,
      player.y - player.radius * 0.32,
      player.radius * 0.35,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    const fontSize = Math.max(14, player.radius * 0.42);
    ctx.font = `${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.fillStyle = '#f2f7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.nickname, player.x, player.y);
  }
}
