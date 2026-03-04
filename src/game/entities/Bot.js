import { BOT_CONFIG } from '../../shared/config';
import { normalize } from '../../shared/utils';
import Player from './Player';

function nearestByDistance(origin, candidates, predicate = () => true) {
  let nearest = null;
  let nearestDistSq = Infinity;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];

    if (!predicate(candidate)) {
      continue;
    }

    const dx = candidate.pos.x - origin.x;
    const dy = candidate.pos.y - origin.y;
    const distSq = dx * dx + dy * dy;

    if (distSq >= nearestDistSq) {
      continue;
    }

    nearest = candidate;
    nearestDistSq = distSq;
  }

  return nearest;
}

export default class Bot extends Player {
  constructor({ id, nickname, color, strokeColor, x, y, rng }) {
    super({
      id,
      x,
      y,
      nickname,
      color,
      strokeColor,
      initialMass: BOT_CONFIG.initialMass,
    });

    this.rng = rng;
    this.decisionTimer = 0;
    this.target = { x, y };
    this.respawnTimer = BOT_CONFIG.respawnDelay;
  }

  scheduleDecision() {
    this.decisionTimer = this.rng.range(
      BOT_CONFIG.decisionIntervalMin,
      BOT_CONFIG.decisionIntervalMax,
    );
  }

  buildWanderTarget(center) {
    const angle = this.rng.range(0, Math.PI * 2);
    const distance = this.rng.range(BOT_CONFIG.wanderDistanceMin, BOT_CONFIG.wanderDistanceMax);

    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };
  }

  think(world) {
    if (!this.hasAliveCells()) {
      return;
    }

    const center = this.getCenterOfMass();
    const largestMass = this.getLargestCellMass();
    const nearbyBlobs = world.blobGrid.queryCircle(center.x, center.y, BOT_CONFIG.visionRange);

    let threatX = 0;
    let threatY = 0;

    for (let index = 0; index < nearbyBlobs.length; index += 1) {
      const enemy = nearbyBlobs[index];

      if (enemy.ownerId === this.id || enemy.mass < largestMass * BOT_CONFIG.fearMassRatio) {
        continue;
      }

      const dx = center.x - enemy.pos.x;
      const dy = center.y - enemy.pos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= 0.0001) {
        continue;
      }

      const weight = enemy.mass / (largestMass + 1) / Math.max(1, distSq);
      threatX += dx * weight;
      threatY += dy * weight;
    }

    if (Math.abs(threatX) + Math.abs(threatY) > 0.000001) {
      const fleeDir = normalize(threatX, threatY, this.aim.x, this.aim.y);
      this.target = {
        x: center.x + fleeDir.x * BOT_CONFIG.fleeDistance,
        y: center.y + fleeDir.y * BOT_CONFIG.fleeDistance,
      };
      return;
    }

    const prey = nearestByDistance(
      center,
      nearbyBlobs,
      (enemy) => enemy.ownerId !== this.id && largestMass >= enemy.mass * BOT_CONFIG.chaseMassRatio,
    );

    if (prey) {
      this.target = { x: prey.pos.x, y: prey.pos.y };
      return;
    }

    const nearbyFood = world.foodGrid.queryCircle(center.x, center.y, BOT_CONFIG.visionRange);
    const food = nearestByDistance(center, nearbyFood);

    if (food) {
      this.target = { x: food.pos.x, y: food.pos.y };
      return;
    }

    this.target = this.buildWanderTarget(center);
  }

  updateAI(world, deltaTime) {
    if (!this.hasAliveCells()) {
      this.respawnTimer -= deltaTime;

      if (this.respawnTimer <= 0) {
        this.respawn(world);
      }

      return;
    }

    this.decisionTimer -= deltaTime;

    if (this.decisionTimer <= 0) {
      this.think(world);
      this.scheduleDecision();
    }

    this.updateAim(this.target, deltaTime);
  }

  respawn(world) {
    const spawn = world.getRandomPosition(80);
    this.spawnSingleCell({
      x: spawn.x,
      y: spawn.y,
      mass: BOT_CONFIG.initialMass,
    });

    this.target = { x: spawn.x, y: spawn.y };
    this.scheduleDecision();
    this.respawnTimer = BOT_CONFIG.respawnDelay;
  }

  getLargestCellMass() {
    let maxMass = 0;

    for (let index = 0; index < this.cells.length; index += 1) {
      maxMass = Math.max(maxMass, this.cells[index].mass);
    }

    return maxMass;
  }
}
