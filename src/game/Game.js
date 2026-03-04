import Camera from './Camera';
import Input from './Input';
import Renderer from './Renderer';
import World from './World';
import Player from './entities/Player';
import { distanceSquared } from '../shared/utils';

const MAX_DELTA_TIME = 0.05;
const HUD_UPDATE_INTERVAL = 0.1;

export default class Game {
  constructor(canvas, { nickname, onStatsChange }) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });

    if (!context) {
      throw new Error('Could not create 2D context for the game canvas.');
    }

    this.context = context;
    this.world = new World();
    this.player = new Player({
      x: this.world.width / 2,
      y: this.world.height / 2,
      nickname,
    });
    this.camera = new Camera();
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas, context, this.camera, this.world);
    this.onStatsChange = onStatsChange;

    this.running = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.hudTimer = 0;

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.world.seedFood();
    this.input.connect();
    window.addEventListener('resize', this.resize);
    this.resize();

    this.publishStats();
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.resize);
    this.input.disconnect();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    this.renderer.resize(width, height, dpr);
    this.camera.setViewport(width, height);
    this.input.centerMouse();
  }

  tick(timestamp) {
    if (!this.running) {
      return;
    }

    const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, MAX_DELTA_TIME);
    this.lastFrameTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  update(deltaTime) {
    const mouseWorldPosition = this.input.getWorldMouse(this.camera);

    this.player.update(mouseWorldPosition, deltaTime);
    this.world.clampEntity(this.player);

    let eatenCount = 0;

    for (let index = this.world.food.length - 1; index >= 0; index -= 1) {
      const food = this.world.food[index];
      const collisionRadius = this.player.radius + food.radius;

      if (distanceSquared(this.player, food) <= collisionRadius * collisionRadius) {
        this.player.addMass(food.mass);
        this.world.removeFoodAt(index);
        eatenCount += 1;
      }
    }

    if (eatenCount > 0) {
      this.world.spawnFood(eatenCount);
    }

    this.camera.update(this.player, deltaTime);

    this.hudTimer += deltaTime;
    if (this.hudTimer >= HUD_UPDATE_INTERVAL) {
      this.hudTimer = 0;
      this.publishStats();
    }
  }

  render() {
    this.renderer.render(this.player);
  }

  publishStats() {
    this.onStatsChange({
      mass: this.player.mass,
      radius: this.player.radius,
      foodCount: this.world.food.length,
    });
  }
}
