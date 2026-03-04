import Food from './entities/Food';
import { FOOD_CONFIG, WORLD_CONFIG } from '../shared/config';
import { clamp, randRange } from '../shared/utils';

export default class World {
  constructor(config = WORLD_CONFIG) {
    this.width = config.width;
    this.height = config.height;
    this.initialFoodCount = config.initialFoodCount;
    this.foodSpawnMargin = config.foodSpawnMargin;
    this.food = [];
  }

  seedFood() {
    this.spawnFood(this.initialFoodCount);
  }

  spawnFood(amount = 1) {
    for (let index = 0; index < amount; index += 1) {
      const margin = this.foodSpawnMargin;
      const x = randRange(margin, this.width - margin);
      const y = randRange(margin, this.height - margin);
      const mass = randRange(FOOD_CONFIG.minMass, FOOD_CONFIG.maxMass);
      const colorIndex = Math.floor(Math.random() * FOOD_CONFIG.colors.length);
      const color = FOOD_CONFIG.colors[colorIndex];

      this.food.push(new Food(x, y, mass, color));
    }
  }

  clampEntity(entity) {
    entity.x = clamp(entity.x, entity.radius, this.width - entity.radius);
    entity.y = clamp(entity.y, entity.radius, this.height - entity.radius);
  }

  removeFoodAt(index) {
    this.food.splice(index, 1);
  }
}
