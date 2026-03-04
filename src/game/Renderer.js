import { RENDER_CONFIG } from '../shared/config';

export default class Renderer {
  constructor(canvas, context, camera, worldBounds) {
    this.canvas = canvas;
    this.context = context;
    this.camera = camera;
    this.worldBounds = worldBounds;
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

  render(frame) {
    const ctx = this.context;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = RENDER_CONFIG.background;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.drawWorldFill();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.worldBounds.width, this.worldBounds.height);
    ctx.clip();

    const viewBounds = this.camera.getViewBounds(180);
    this.drawGrid(viewBounds);
    this.drawFoods(frame.foods, viewBounds);
    this.drawPellets(frame.pellets, viewBounds);
    this.drawBlobs(frame.blobs, viewBounds);

    ctx.restore();
    this.drawWorldBorder();
    ctx.restore();
  }

  drawWorldFill() {
    const ctx = this.context;

    ctx.fillStyle = RENDER_CONFIG.worldFill;
    ctx.fillRect(0, 0, this.worldBounds.width, this.worldBounds.height);
  }

  drawWorldBorder() {
    const ctx = this.context;

    ctx.save();
    ctx.lineWidth = 18 / this.camera.zoom;
    ctx.strokeStyle = RENDER_CONFIG.worldBorderGlow;
    ctx.globalAlpha = 0.32;
    ctx.shadowColor = RENDER_CONFIG.worldBorderGlow;
    ctx.shadowBlur = 30 / this.camera.zoom;
    ctx.strokeRect(0, 0, this.worldBounds.width, this.worldBounds.height);
    ctx.restore();

    ctx.lineWidth = 4 / this.camera.zoom;
    ctx.strokeStyle = RENDER_CONFIG.worldBorder;
    ctx.strokeRect(0, 0, this.worldBounds.width, this.worldBounds.height);
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

  isInsideView(entity, bounds) {
    return !(
      entity.x + entity.r < bounds.left ||
      entity.x - entity.r > bounds.right ||
      entity.y + entity.r < bounds.top ||
      entity.y - entity.r > bounds.bottom
    );
  }

  drawFoods(foods, bounds) {
    const ctx = this.context;

    for (let index = 0; index < foods.length; index += 1) {
      const food = foods[index];

      if (!this.isInsideView(food, bounds)) {
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = food.color;
      ctx.arc(food.x, food.y, food.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPellets(pellets, bounds) {
    const ctx = this.context;

    for (let index = 0; index < pellets.length; index += 1) {
      const pellet = pellets[index];

      if (!this.isInsideView(pellet, bounds)) {
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = pellet.color;
      ctx.strokeStyle = pellet.stroke;
      ctx.lineWidth = 2 / this.camera.zoom;
      ctx.arc(pellet.x, pellet.y, pellet.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawBlobs(blobs, bounds) {
    const visible = [];

    for (let index = 0; index < blobs.length; index += 1) {
      if (this.isInsideView(blobs[index], bounds)) {
        visible.push(blobs[index]);
      }
    }

    visible.sort((left, right) => left.r - right.r);

    for (let index = 0; index < visible.length; index += 1) {
      this.drawBlob(visible[index]);
    }
  }

  drawBlob(blob) {
    const ctx = this.context;

    ctx.beginPath();
    ctx.fillStyle = blob.color;
    ctx.strokeStyle = blob.stroke;
    ctx.lineWidth = 6 / this.camera.zoom;
    ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.arc(blob.x - blob.r * 0.32, blob.y - blob.r * 0.32, blob.r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    if (blob.r < 16) {
      return;
    }

    const fontSize = Math.max(13, blob.r * 0.35);
    ctx.font = `${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.fillStyle = '#f2f7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(blob.nickname, blob.x, blob.y);
  }
}
