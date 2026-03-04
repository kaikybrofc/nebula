import Camera from './Camera';
import Input from './Input';
import Renderer from './Renderer';
import World from './World';
import Bot from './entities/Bot';
import Player from './entities/Player';
import {
  BOT_CONFIG,
  COMBAT_CONFIG,
  GAME_SETTINGS_DEFAULTS,
  PELLET_CONFIG,
  PLAYER_CONFIG,
  SIM_CONFIG,
} from '../shared/config';
import SeededRandom from '../shared/random';
import { clamp, distanceSquaredPos } from '../shared/utils';

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
    this.rng = new SeededRandom(SIM_CONFIG.seed);
    this.world = new World(this.rng);

    const playerSpawn = this.world.getRandomPosition(120);
    this.player = new Player({
      id: 'player_local',
      x: playerSpawn.x,
      y: playerSpawn.y,
      nickname,
    });

    this.bots = this.createBots();
    this.owners = [this.player, ...this.bots];

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
    this.accumulator = 0;
    this.hudTimer = 0;

    this.currentFps = 0;
    this.fpsTimer = 0;
    this.fpsFrameCount = 0;

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
  }

  createBots() {
    const bots = [];

    for (let index = 0; index < BOT_CONFIG.count; index += 1) {
      const palette = BOT_CONFIG.colorPalette[index % BOT_CONFIG.colorPalette.length];
      const spawn = this.world.getRandomPosition(120);

      bots.push(
        new Bot({
          id: `bot_${index + 1}`,
          nickname: `Bot ${index + 1}`,
          color: palette.color,
          strokeColor: palette.stroke,
          x: spawn.x,
          y: spawn.y,
          rng: this.rng,
        }),
      );
    }

    return bots;
  }

  getAllCells() {
    const cells = [];

    for (let ownerIndex = 0; ownerIndex < this.owners.length; ownerIndex += 1) {
      const owner = this.owners[ownerIndex];

      for (let cellIndex = 0; cellIndex < owner.cells.length; cellIndex += 1) {
        cells.push(owner.cells[cellIndex]);
      }
    }

    return cells;
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
    this.accumulator = 0;
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

    const frameDelta = Math.min(
      (timestamp - this.lastFrameTime) / 1000,
      SIM_CONFIG.maxFrameDelta,
    );
    this.lastFrameTime = timestamp;

    this.accumulator += frameDelta;

    while (this.accumulator >= SIM_CONFIG.fixedTimeStep) {
      this.updateSimulation(SIM_CONFIG.fixedTimeStep);
      this.accumulator -= SIM_CONFIG.fixedTimeStep;
    }

    this.updateFpsCounter(frameDelta);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  updateSimulation(deltaTime) {
    this.ensurePlayerAlive();

    const mouseWorldPosition = this.input.getWorldMouse(this.camera);

    this.world.rebuildSpatialIndexes(this.getAllCells());

    for (let ownerIndex = 0; ownerIndex < this.owners.length; ownerIndex += 1) {
      this.owners[ownerIndex].tickTimers(deltaTime);
    }

    this.player.updateAim(mouseWorldPosition, deltaTime);

    if (this.input.consumeSplit()) {
      this.player.trySplit(this.world);
    }

    if (this.input.isEjectHeld()) {
      this.world.addPellets(this.player.tryEject());
    }

    for (let botIndex = 0; botIndex < this.bots.length; botIndex += 1) {
      this.bots[botIndex].updateAI(this.world, deltaTime);
    }

    this.player.updateMovement(mouseWorldPosition, this.world, deltaTime);

    for (let botIndex = 0; botIndex < this.bots.length; botIndex += 1) {
      const bot = this.bots[botIndex];

      if (!bot.hasAliveCells()) {
        continue;
      }

      bot.updateMovement(bot.target, this.world, deltaTime);
    }

    this.world.updatePellets(deltaTime);

    this.world.rebuildSpatialIndexes(this.getAllCells());
    this.resolveFoodCollisions();
    this.resolvePelletCollisions();

    this.world.rebuildBlobIndex(this.getAllCells());
    this.resolveCellEating();

    for (let ownerIndex = 0; ownerIndex < this.owners.length; ownerIndex += 1) {
      const owner = this.owners[ownerIndex];

      if (!owner.hasAliveCells()) {
        continue;
      }

      this.world.rebuildBlobIndex(this.getAllCells());
      owner.resolveInternalCollisions(this.world, this.world.blobGrid);
    }

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

    this.hudTimer += deltaTime;
    if (this.hudTimer >= HUD_UPDATE_INTERVAL) {
      this.hudTimer = 0;
      this.publishStats();
    }
  }

  ensurePlayerAlive() {
    if (this.player.hasAliveCells()) {
      return;
    }

    const spawn = this.world.getRandomPosition(140);
    this.player.spawnSingleCell({
      x: spawn.x,
      y: spawn.y,
      mass: PLAYER_CONFIG.initialMass,
    });
  }

  resolveFoodCollisions() {
    const eatenFoodIds = new Set();

    for (let ownerIndex = 0; ownerIndex < this.owners.length; ownerIndex += 1) {
      const owner = this.owners[ownerIndex];

      for (let cellIndex = 0; cellIndex < owner.cells.length; cellIndex += 1) {
        const cell = owner.cells[cellIndex];
        const nearbyFood = this.world.foodGrid.queryCircle(cell.pos.x, cell.pos.y, cell.radius + 18);

        for (let foodIndex = 0; foodIndex < nearbyFood.length; foodIndex += 1) {
          const food = nearbyFood[foodIndex];

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
    }

    const eatenCount = this.world.removeFoodByIds(eatenFoodIds);

    if (eatenCount > 0) {
      this.world.spawnFood(eatenCount);
    }
  }

  resolvePelletCollisions() {
    const eatenPelletIds = new Set();

    for (let ownerIndex = 0; ownerIndex < this.owners.length; ownerIndex += 1) {
      const owner = this.owners[ownerIndex];

      for (let cellIndex = 0; cellIndex < owner.cells.length; cellIndex += 1) {
        const cell = owner.cells[cellIndex];
        const nearbyPellets = this.world.pelletGrid.queryCircle(cell.pos.x, cell.pos.y, cell.radius + 26);

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
    }

    this.world.removePelletsByIds(eatenPelletIds);
  }

  resolveCellEating() {
    const removedCellIds = new Set();
    const cells = this.getAllCells();
    const eaters = [...cells].sort((left, right) => {
      if (right.mass !== left.mass) {
        return right.mass - left.mass;
      }

      return left.id.localeCompare(right.id);
    });

    for (let eaterIndex = 0; eaterIndex < eaters.length; eaterIndex += 1) {
      const eater = eaters[eaterIndex];

      if (removedCellIds.has(eater.id)) {
        continue;
      }

      const nearby = this.world.blobGrid.queryCircle(eater.pos.x, eater.pos.y, eater.radius + 180);

      for (let preyIndex = 0; preyIndex < nearby.length; preyIndex += 1) {
        const prey = nearby[preyIndex];

        if (
          prey.id === eater.id ||
          removedCellIds.has(prey.id) ||
          prey.ownerId === eater.ownerId ||
          prey.spawnProtection > 0
        ) {
          continue;
        }

        if (eater.mass < prey.mass * COMBAT_CONFIG.eatMassThreshold) {
          continue;
        }

        const requiredOverlapDistance = eater.radius - prey.radius * COMBAT_CONFIG.eatOverlapFactor;

        if (requiredOverlapDistance <= 0) {
          continue;
        }

        const distance = Math.sqrt(distanceSquaredPos(eater, prey));

        if (distance >= requiredOverlapDistance) {
          continue;
        }

        eater.addMass(prey.mass);
        removedCellIds.add(prey.id);
      }
    }

    if (removedCellIds.size === 0) {
      return;
    }

    for (let ownerIndex = 0; ownerIndex < this.owners.length; ownerIndex += 1) {
      this.owners[ownerIndex].removeCellsByIds(removedCellIds);
    }
  }

  updateFpsCounter(frameDelta) {
    this.fpsFrameCount += 1;
    this.fpsTimer += frameDelta;

    if (this.fpsTimer < FPS_UPDATE_INTERVAL) {
      return;
    }

    this.currentFps = Math.round(this.fpsFrameCount / this.fpsTimer);
    this.fpsTimer = 0;
    this.fpsFrameCount = 0;
  }

  buildLeaderboard() {
    const ranking = this.owners
      .map((owner) => ({
        id: owner.id,
        name: owner.nickname,
        mass: owner.getTotalMass(),
      }))
      .sort((left, right) => {
        if (right.mass !== left.mass) {
          return right.mass - left.mass;
        }

        return left.id.localeCompare(right.id);
      });

    const playerRank = Math.max(
      1,
      ranking.findIndex((entry) => entry.id === this.player.id) + 1,
    );

    return {
      top10: ranking.slice(0, 10),
      playerRank,
    };
  }

  render() {
    this.renderer.render(this.owners);
  }

  publishStats() {
    if (!this.onStatsChange) {
      return;
    }

    const totalMass = this.player.getTotalMass();
    const leaderboard = this.buildLeaderboard();

    this.onStatsChange({
      mass: totalMass,
      radius: this.player.getLargestRadius(),
      foodCount: this.world.food.length,
      pelletCount: this.world.pellets.length,
      cellCount: this.player.cells.length,
      fps: this.currentFps,
      score: Math.max(0, totalMass - PLAYER_CONFIG.initialMass),
      leaderboard: leaderboard.top10,
      playerRank: leaderboard.playerRank,
    });
  }
}
