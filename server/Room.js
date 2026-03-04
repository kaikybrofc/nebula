import World from '../src/game/World.js';
import Player from '../src/game/entities/Player.js';
import {
  CAMERA_CONFIG,
  COMBAT_CONFIG,
  PELLET_CONFIG,
  PLAYER_CONFIG,
  SIM_CONFIG,
  VIEW_RADIUS_BASE,
  VIEW_RADIUS_MULTIPLIER,
} from '../src/shared/config.js';
import SeededRandom from '../src/shared/random.js';
import { clamp, distanceSquaredPos } from '../src/shared/utils.js';

export default class Room {
  constructor() {
    this.rng = new SeededRandom(SIM_CONFIG.seed);
    this.world = new World(this.rng);
    this.world.seedFood();

    this.tick = 0;
    this.nextPlayerId = 1;

    this.clients = new Map();
  }

  addClient(socket, nickname) {
    if (this.clients.has(socket)) {
      return;
    }

    const safeName = typeof nickname === 'string' && nickname.trim() ? nickname.trim() : 'Player';
    const spawn = this.world.getRandomPosition(120);
    const player = new Player({
      id: `p_${this.nextPlayerId}`,
      x: spawn.x,
      y: spawn.y,
      nickname: safeName,
    });

    this.nextPlayerId += 1;

    this.clients.set(socket, {
      socket,
      player,
      input: {
        seq: 0,
        dx: 0,
        dy: 0,
        split: false,
        eject: false,
      },
      respawnTimer: 0,
    });
  }

  removeClient(socket) {
    this.clients.delete(socket);
  }

  updateInput(socket, inputPayload) {
    const client = this.clients.get(socket);

    if (!client) {
      return;
    }

    const dx = Number(inputPayload.dx) || 0;
    const dy = Number(inputPayload.dy) || 0;
    const length = Math.hypot(dx, dy);
    const normalizedX = length > 1 ? dx / length : dx;
    const normalizedY = length > 1 ? dy / length : dy;

    client.input = {
      seq: Number(inputPayload.seq) || 0,
      dx: normalizedX,
      dy: normalizedY,
      split: Boolean(inputPayload.split),
      eject: Boolean(inputPayload.eject),
    };
  }

  getPlayers() {
    const players = [];

    for (const client of this.clients.values()) {
      players.push(client.player);
    }

    return players;
  }

  getAllCells() {
    const cells = [];
    const players = this.getPlayers();

    for (let playerIndex = 0; playerIndex < players.length; playerIndex += 1) {
      const player = players[playerIndex];

      for (let cellIndex = 0; cellIndex < player.cells.length; cellIndex += 1) {
        cells.push(player.cells[cellIndex]);
      }
    }

    return cells;
  }

  respawnIfNeeded(client, deltaTime) {
    const { player } = client;

    if (player.hasAliveCells()) {
      client.respawnTimer = 0;
      return;
    }

    if (client.respawnTimer <= 0) {
      client.respawnTimer = 2;
    }

    client.respawnTimer -= deltaTime;

    if (client.respawnTimer > 0) {
      return;
    }

    const spawn = this.world.getRandomPosition(140);
    player.spawnSingleCell({
      x: spawn.x,
      y: spawn.y,
      mass: PLAYER_CONFIG.initialMass,
    });
    client.respawnTimer = 0;
  }

  step(deltaTime) {
    this.tick += 1;

    const clients = [...this.clients.values()];

    for (let index = 0; index < clients.length; index += 1) {
      this.respawnIfNeeded(clients[index], deltaTime);
    }

    this.world.rebuildSpatialIndexes(this.getAllCells());

    for (let index = 0; index < clients.length; index += 1) {
      clients[index].player.tickTimers(deltaTime);
    }

    for (let index = 0; index < clients.length; index += 1) {
      const client = clients[index];
      const player = client.player;

      if (!player.hasAliveCells()) {
        continue;
      }

      const center = player.getCenterOfMass();
      const target = {
        x: center.x + client.input.dx * 600,
        y: center.y + client.input.dy * 600,
      };

      player.updateAim(target, deltaTime);

      if (client.input.split) {
        player.trySplit(this.world);
        client.input.split = false;
      }

      if (client.input.eject) {
        this.world.addPellets(player.tryEject());
      }

      player.updateMovement(target, this.world, deltaTime);
    }

    this.world.updatePellets(deltaTime);

    this.world.rebuildSpatialIndexes(this.getAllCells());
    this.resolveFoodCollisions();
    this.resolvePelletCollisions();

    this.world.rebuildBlobIndex(this.getAllCells());
    this.resolveCellEating();

    for (let index = 0; index < clients.length; index += 1) {
      const player = clients[index].player;

      if (!player.hasAliveCells()) {
        continue;
      }

      this.world.rebuildBlobIndex(this.getAllCells());
      player.resolveInternalCollisions(this.world, this.world.blobGrid);
    }
  }

  resolveFoodCollisions() {
    const eatenFoodIds = new Set();
    const players = this.getPlayers();

    for (let playerIndex = 0; playerIndex < players.length; playerIndex += 1) {
      const player = players[playerIndex];

      for (let cellIndex = 0; cellIndex < player.cells.length; cellIndex += 1) {
        const cell = player.cells[cellIndex];
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
    const players = this.getPlayers();

    for (let playerIndex = 0; playerIndex < players.length; playerIndex += 1) {
      const player = players[playerIndex];

      for (let cellIndex = 0; cellIndex < player.cells.length; cellIndex += 1) {
        const cell = player.cells[cellIndex];
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

    const players = this.getPlayers();

    for (let index = 0; index < players.length; index += 1) {
      players[index].removeCellsByIds(removedCellIds);
    }
  }

  buildLeaderboard() {
    const leaderboard = this.getPlayers()
      .map((player) => ({
        id: player.id,
        name: player.nickname,
        mass: player.getTotalMass(),
      }))
      .sort((left, right) => {
        if (right.mass !== left.mass) {
          return right.mass - left.mass;
        }

        return left.id.localeCompare(right.id);
      })
      .slice(0, 10);

    return leaderboard;
  }

  getPlayerViewCenter(player) {
    if (!player.hasAliveCells()) {
      return {
        x: this.world.width * 0.5,
        y: this.world.height * 0.5,
      };
    }

    return player.getCenterOfMass();
  }

  getPlayerViewRadius(player) {
    if (!player.hasAliveCells()) {
      return VIEW_RADIUS_BASE;
    }

    const totalMass = Math.max(1, player.getTotalMass());
    const massScale = Math.pow(CAMERA_CONFIG.referenceMass / totalMass, CAMERA_CONFIG.zoomExponent);
    const zoom = clamp(
      CAMERA_CONFIG.baseZoom * massScale,
      CAMERA_CONFIG.minZoom,
      CAMERA_CONFIG.maxZoom,
    );

    return (VIEW_RADIUS_BASE / Math.max(0.01, zoom)) * VIEW_RADIUS_MULTIPLIER;
  }

  isInsideView(entity, center, viewRadius) {
    const dx = entity.pos.x - center.x;
    const dy = entity.pos.y - center.y;
    return dx * dx + dy * dy <= viewRadius * viewRadius;
  }

  queryVisibleEntities(grid, center, viewRadius) {
    const nearby = grid.queryCircle(center.x, center.y, viewRadius);
    const visible = [];

    for (let index = 0; index < nearby.length; index += 1) {
      const entity = nearby[index];

      if (!this.isInsideView(entity, center, viewRadius)) {
        continue;
      }

      visible.push(entity);
    }

    return visible;
  }

  serializeBlob(cell) {
    return {
      id: cell.id,
      ownerId: cell.ownerId,
      x: cell.pos.x,
      y: cell.pos.y,
      r: cell.radius,
      mass: cell.mass,
      nickname: cell.nickname,
      color: cell.color,
      stroke: cell.strokeColor,
    };
  }

  serializeFood(food) {
    return {
      id: food.id,
      x: food.pos.x,
      y: food.pos.y,
      r: food.radius,
      color: food.color,
    };
  }

  serializePellet(pellet) {
    return {
      id: pellet.id,
      ownerId: pellet.ownerId,
      x: pellet.pos.x,
      y: pellet.pos.y,
      r: pellet.radius,
      color: pellet.color,
      stroke: pellet.strokeColor,
    };
  }

  buildSnapshotForClient(client, leaderboard) {
    const viewCenter = this.getPlayerViewCenter(client.player);
    const viewRadius = this.getPlayerViewRadius(client.player);
    const visibleBlobs = this.queryVisibleEntities(this.world.blobGrid, viewCenter, viewRadius);
    const visibleFoods = this.queryVisibleEntities(this.world.foodGrid, viewCenter, viewRadius);
    const visiblePellets = this.queryVisibleEntities(this.world.pelletGrid, viewCenter, viewRadius);

    return {
      type: 'snapshot',
      tick: this.tick,
      selfId: client.player.id,
      entities: {
        blobs: visibleBlobs.map((cell) => this.serializeBlob(cell)),
        foods: visibleFoods.map((food) => this.serializeFood(food)),
        pellets: visiblePellets.map((pellet) => this.serializePellet(pellet)),
      },
      leaderboard,
    };
  }

  broadcastSnapshots() {
    if (this.clients.size === 0) {
      return;
    }

    // Rebuild once so visibility queries always use the latest post-step state.
    this.world.rebuildSpatialIndexes(this.getAllCells());
    const leaderboard = this.buildLeaderboard();

    for (const client of this.clients.values()) {
      if (client.socket.readyState !== 1) {
        continue;
      }

      const snapshot = this.buildSnapshotForClient(client, leaderboard);
      client.socket.send(JSON.stringify(snapshot));
    }
  }
}
