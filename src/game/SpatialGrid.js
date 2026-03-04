export default class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  insert(entity) {
    const minX = Math.floor((entity.pos.x - entity.radius) / this.cellSize);
    const maxX = Math.floor((entity.pos.x + entity.radius) / this.cellSize);
    const minY = Math.floor((entity.pos.y - entity.radius) / this.cellSize);
    const maxY = Math.floor((entity.pos.y + entity.radius) / this.cellSize);

    for (let cellY = minY; cellY <= maxY; cellY += 1) {
      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        const key = `${cellX},${cellY}`;
        const bucket = this.cells.get(key);

        if (bucket) {
          bucket.push(entity);
        } else {
          this.cells.set(key, [entity]);
        }
      }
    }
  }

  insertMany(entities) {
    for (let index = 0; index < entities.length; index += 1) {
      this.insert(entities[index]);
    }
  }

  queryCircle(x, y, radius) {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    const results = [];
    const seen = new Set();

    for (let cellY = minY; cellY <= maxY; cellY += 1) {
      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        const key = `${cellX},${cellY}`;
        const bucket = this.cells.get(key);

        if (!bucket) {
          continue;
        }

        for (let index = 0; index < bucket.length; index += 1) {
          const candidate = bucket[index];

          if (seen.has(candidate.id)) {
            continue;
          }

          seen.add(candidate.id);
          results.push(candidate);
        }
      }
    }

    return results;
  }
}
