import Food from './entities/Food';
import SpatialGrid from './SpatialGrid';
import { FOOD_CONFIG, GRID_CONFIG, PELLET_CONFIG, WORLD_CONFIG } from '../shared/config';
import { applyExponentialDrag, clamp } from '../shared/utils';

export default class World {
  constructor(rng, config = WORLD_CONFIG) {
    this.rng = rng;
    this.width = config.width;
    this.height = config.height;
    this.initialFoodCount = config.initialFoodCount;
    this.foodSpawnMargin = config.foodSpawnMargin;

    this.food = [];
    this.pellets = [];

    this.foodGrid = new SpatialGrid(GRID_CONFIG.cellSize);
    this.pelletGrid = new SpatialGrid(GRID_CONFIG.cellSize);
    this.blobGrid = new SpatialGrid(GRID_CONFIG.cellSize);
  }

  seedFood() {
    this.spawnFood(this.initialFoodCount);
  }

  getRandomPosition(margin = this.foodSpawnMargin) {
    return {
      x: this.rng.range(margin, this.width - margin),
      y: this.rng.range(margin, this.height - margin),
    };
  }

  spawnFood(amount = 1) {
    for (let index = 0; index < amount; index += 1) {
      const position = this.getRandomPosition(this.foodSpawnMargin);
      const mass = this.rng.range(FOOD_CONFIG.minMass, FOOD_CONFIG.maxMass);
      const colorIndex = this.rng.int(FOOD_CONFIG.colors.length);
      const color = FOOD_CONFIG.colors[colorIndex];

      this.food.push(new Food(position.x, position.y, mass, color));
    }
  }

  addPellets(nextPellets) {
    for (let index = 0; index < nextPellets.length; index += 1) {
      const pellet = nextPellets[index];
      this.clampEntity(pellet);
      this.pellets.push(pellet);
    }
  }

  updatePellets(deltaTime) {
    for (let index = 0; index < this.pellets.length; index += 1) {
      const pellet = this.pellets[index];

      pellet.age += deltaTime;
      applyExponentialDrag(pellet.vel, PELLET_CONFIG.drag, deltaTime);

      pellet.pos.x += pellet.vel.x * deltaTime;
      pellet.pos.y += pellet.vel.y * deltaTime;
      this.clampEntity(pellet);
    }
  }

  rebuildSpatialIndexes(blobs) {
    this.foodGrid.clear();
    this.pelletGrid.clear();
    this.blobGrid.clear();

    this.foodGrid.insertMany(this.food);
    this.pelletGrid.insertMany(this.pellets);
    this.blobGrid.insertMany(blobs);
  }

  rebuildBlobIndex(blobs) {
    this.blobGrid.clear();
    this.blobGrid.insertMany(blobs);
  }

  removeFoodByIds(idsToRemove) {
    if (idsToRemove.size === 0) {
      return 0;
    }

    const before = this.food.length;
    this.food = this.food.filter((food) => !idsToRemove.has(food.id));
    return before - this.food.length;
  }

  removePelletsByIds(idsToRemove) {
    if (idsToRemove.size === 0) {
      return 0;
    }

    const before = this.pellets.length;
    this.pellets = this.pellets.filter((pellet) => !idsToRemove.has(pellet.id));
    return before - this.pellets.length;
  }

  clampEntity(entity) {
    const minX = entity.radius;
    const maxX = this.width - entity.radius;
    const minY = entity.radius;
    const maxY = this.height - entity.radius;

    if (entity.pos.x < minX) {
      entity.pos.x = minX;
      entity.vel.x = Math.max(0, entity.vel.x);
    } else if (entity.pos.x > maxX) {
      entity.pos.x = maxX;
      entity.vel.x = Math.min(0, entity.vel.x);
    }

    if (entity.pos.y < minY) {
      entity.pos.y = minY;
      entity.vel.y = Math.max(0, entity.vel.y);
    } else if (entity.pos.y > maxY) {
      entity.pos.y = maxY;
      entity.vel.y = Math.min(0, entity.vel.y);
    }

    entity.pos.x = clamp(entity.pos.x, minX, maxX);
    entity.pos.y = clamp(entity.pos.y, minY, maxY);
  }
}
