import Camera from './Camera';
import Input from './Input';
import Renderer from './Renderer';
import World from './World';
import Player from './entities/Player';
import { GAME_SETTINGS_DEFAULTS, PELLET_CONFIG, PLAYER_CONFIG } from '../shared/config';
import { clamp, distanceSquaredPos } from '../shared/utils';

const MAX_DELTA_TIME = 0.05;
const HUD_UPDATE_INTERVAL = 0.1;
const FPS_UPDATE_INTERVAL = 0.4;

export default class Game {
  constructor(canvas, { nickname, onStatsChange, settings = GAME_SETTINGS_DEFAULTS }) {
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

    const center = this.player.getCenterOfMass();
    this.camera.x = center.x;
    this.camera.y = center.y;

    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas, context, this.camera, this.world);
    this.onStatsChange = onStatsChange;

    this.settings = {
      sensitivity: GAME_SETTINGS_DEFAULTS.sensitivity,
      zoom: GAME_SETTINGS_DEFAULTS.zoom,
    };
    this.setSettings(settings);

    this.running = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.hudTimer = 0;

    this.currentFps = 0;
    this.fpsTimer = 0;
    this.fpsFrameCount = 0;

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
  }

  setSettings(nextSettings = {}) {
    this.settings = {
      sensitivity: clamp(
        nextSettings.sensitivity ?? this.settings.sensitivity,
        0.45,
        1.8,
      ),
      zoom: clamp(nextSettings.zoom ?? this.settings.zoom, 0.65, 1.35),
    };

    this.player.setSensitivity(this.settings.sensitivity);
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

    this.player.tickTimers(deltaTime);
    this.player.updateAim(mouseWorldPosition, deltaTime);

    if (this.input.consumeSplit()) {
      this.player.trySplit(this.world);
    }

    if (this.input.isEjectHeld()) {
      const pellets = this.player.tryEject();
      this.world.addPellets(pellets);
    }

    this.player.updateMovement(mouseWorldPosition, this.world, deltaTime);
    this.world.updatePellets(deltaTime);

    this.world.rebuildSpatialIndexes(this.player.cells);
    this.resolveFoodCollisions();
    this.resolvePelletCollisions();
    this.world.rebuildBlobIndex(this.player.cells);
    this.player.resolveInternalCollisions(this.world, this.world.blobGrid);

    const center = this.player.getCenterOfMass();
    this.camera.update(
      {
        x: center.x,
        y: center.y,
        mass: this.player.getTotalMass(),
      },
      deltaTime,
      this.settings.zoom,
    );

    this.updateFpsCounter(deltaTime);

    this.hudTimer += deltaTime;
    if (this.hudTimer >= HUD_UPDATE_INTERVAL) {
      this.hudTimer = 0;
      this.publishStats();
    }
  }

  updateFpsCounter(deltaTime) {
    this.fpsFrameCount += 1;
    this.fpsTimer += deltaTime;

    if (this.fpsTimer < FPS_UPDATE_INTERVAL) {
      return;
    }

    this.currentFps = Math.round(this.fpsFrameCount / this.fpsTimer);
    this.fpsTimer = 0;
    this.fpsFrameCount = 0;
  }

  resolveFoodCollisions() {
    const eatenFoodIds = new Set();

    for (let cellIndex = 0; cellIndex < this.player.cells.length; cellIndex += 1) {
      const cell = this.player.cells[cellIndex];
      const nearbyFood = this.world.foodGrid.queryCircle(cell.pos.x, cell.pos.y, cell.radius + 14);

      for (let candidateIndex = 0; candidateIndex < nearbyFood.length; candidateIndex += 1) {
        const food = nearbyFood[candidateIndex];

        if (eatenFoodIds.has(food.id)) {
          continue;
        }

        const overlapRadius = cell.radius + food.radius;
        if (distanceSquaredPos(cell, food) > overlapRadius * overlapRadius) {
          continue;
        }

        cell.addMass(food.mass);
        eatenFoodIds.add(food.id);
      }
    }

    const eatenCount = this.world.removeFoodByIds(eatenFoodIds);

    if (eatenCount > 0) {
      this.world.spawnFood(eatenCount);
    }
  }

  resolvePelletCollisions() {
    const eatenPelletIds = new Set();

    for (let cellIndex = 0; cellIndex < this.player.cells.length; cellIndex += 1) {
      const cell = this.player.cells[cellIndex];
      const nearbyPellets = this.world.pelletGrid.queryCircle(cell.pos.x, cell.pos.y, cell.radius + 24);

      for (let pelletIndex = 0; pelletIndex < nearbyPellets.length; pelletIndex += 1) {
        const pellet = nearbyPellets[pelletIndex];

        if (eatenPelletIds.has(pellet.id)) {
          continue;
        }

        if (pellet.ownerId === cell.ownerId && pellet.age < PELLET_CONFIG.pickupDelay) {
          continue;
        }

        const overlapRadius = cell.radius + pellet.radius;
        if (distanceSquaredPos(cell, pellet) > overlapRadius * overlapRadius) {
          continue;
        }

        cell.addMass(pellet.mass);
        eatenPelletIds.add(pellet.id);
      }
    }

    this.world.removePelletsByIds(eatenPelletIds);
  }

  render() {
    this.renderer.render(this.player);
  }

  publishStats() {
    if (!this.onStatsChange) {
      return;
    }

    const totalMass = this.player.getTotalMass();

    this.onStatsChange({
      mass: totalMass,
      radius: this.player.getLargestRadius(),
      foodCount: this.world.food.length,
      pelletCount: this.world.pellets.length,
      cellCount: this.player.cells.length,
      fps: this.currentFps,
      score: Math.max(0, totalMass - PLAYER_CONFIG.initialMass),
    });
  }
}
