import { PLAYER_CONFIG } from '../../shared/config.js';
import {
  clamp,
  distanceSquaredPos,
} from '../../shared/utils.js';
import Blob from './Blob.js';
import Pellet from './Pellet.js';
import { normalizeDesiredDirection, smoothAim, smoothDirection } from '../movement.js';
import { applyEject, applySplit } from '../sim/actions.js';

export default class Player {
  constructor({
    id = 'player_local',
    x,
    y,
    nickname,
    color = PLAYER_CONFIG.color,
    strokeColor = PLAYER_CONFIG.strokeColor,
    initialMass = PLAYER_CONFIG.initialMass,
  }) {
    this.id = id;
    this.nickname = nickname;
    this.color = color;
    this.strokeColor = strokeColor;

    this.cells = [];
    this.spawnSingleCell({ x, y, mass: initialMass });

    this.desiredDir = { x: 0, y: 0 };
    this.inputDir = { x: 0, y: 0 };
    this.aim = { x: 1, y: 0 };
    this.splitCooldown = 0;
    this.ejectCooldown = 0;
    this.splitHeld = false;
    this.sensitivity = 1;
  }

  spawnSingleCell({ x, y, mass }) {
    this.cells = [
      new Blob({
        x,
        y,
        mass,
        ownerId: this.id,
        color: this.color,
        strokeColor: this.strokeColor,
        nickname: this.nickname,
      }),
    ];
  }

  hasAliveCells() {
    return this.cells.length > 0;
  }

  setSensitivity(nextValue) {
    this.sensitivity = clamp(nextValue, 0.45, 1.8);
  }

  removeCellsByIds(idsToRemove) {
    if (idsToRemove.size === 0) {
      return;
    }

    this.cells = this.cells.filter((cell) => !idsToRemove.has(cell.id));
  }

  tickTimers(deltaTime) {
    this.splitCooldown = Math.max(0, this.splitCooldown - deltaTime);
    this.ejectCooldown = Math.max(0, this.ejectCooldown - deltaTime);

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];
      cell.mergeTimer = Math.max(0, cell.mergeTimer - deltaTime);
      cell.spawnProtection = Math.max(0, cell.spawnProtection - deltaTime);
    }
  }

  updateInputDirection(rawDirection, deltaTime) {
    const nextDesiredDir = normalizeDesiredDirection(rawDirection.x, rawDirection.y);
    this.desiredDir.x = nextDesiredDir.x;
    this.desiredDir.y = nextDesiredDir.y;

    smoothDirection(this.inputDir, this.desiredDir, deltaTime);
    smoothAim(this.aim, this.inputDir, deltaTime);
  }

  updateAim(targetWorld, deltaTime) {
    const center = this.getCenterOfMass();
    const dx = targetWorld.x - center.x;
    const dy = targetWorld.y - center.y;
    this.updateInputDirection({ x: dx, y: dy }, deltaTime);
  }

  updateMovementFromInput(world, deltaTime) {
    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];

      cell.applySteering(this.inputDir, deltaTime, this.sensitivity);

      cell.pos.x += cell.vel.x * deltaTime;
      cell.pos.y += cell.vel.y * deltaTime;
      world.clampEntity(cell);
    }
  }

  updateMovement(targetWorld, world, deltaTime) {
    this.updateAim(targetWorld, deltaTime);
    this.updateMovementFromInput(world, deltaTime);
  }

  trySplit(world, splitRequested = false, sequence = 0) {
    const spawned = applySplit({
      actor: this,
      splitRequested,
      inputDirection: this.inputDir,
      setCellMass: (cell, nextMass) => {
        cell.setMass(nextMass);
      },
      createCell: ({ x, y, mass, ownerId, nickname, color, strokeColor, vx, vy }) =>
        new Blob({
          x,
          y,
          mass,
          ownerId,
          nickname,
          color,
          strokeColor,
          vx,
          vy,
        }),
      clampCell: (cell) => {
        world.clampEntity(cell);
      },
      ownerId: this.id,
      nickname: this.nickname,
      color: this.color,
      strokeColor: this.strokeColor,
      sequence,
      minCellMass: PLAYER_CONFIG.minCellMass,
    });

    return spawned.length > 0;
  }

  tryEject(ejectRequested = false, sequence = 0) {
    return applyEject({
      actor: this,
      ejectRequested,
      inputDirection: this.inputDir,
      sequence,
      setCellMass: (cell, nextMass) => {
        cell.setMass(nextMass);
      },
      createPellet: ({ x, y, mass, ownerId, vx, vy, pickupDelay, maxLife }) =>
        new Pellet({
          x,
          y,
          mass,
          ownerId,
          vx,
          vy,
          pickupDelay,
          maxLife,
        }),
      ownerId: this.id,
      minCellMass: PLAYER_CONFIG.minCellMass,
    });
  }

  resolveInternalCollisions(world, blobGrid) {
    const removeIds = new Set();
    const iterations = Math.max(1, PLAYER_CONFIG.softCollisionIterations || 1);
    const maxPush = PLAYER_CONFIG.softCollisionMaxPush ?? Number.POSITIVE_INFINITY;
    const damping = clamp(1 - (PLAYER_CONFIG.softCollisionDamping || 0), 0, 1);

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      for (let index = 0; index < this.cells.length; index += 1) {
        const cell = this.cells[index];

        if (removeIds.has(cell.id)) {
          continue;
        }

        const nearby = blobGrid.queryCircle(cell.pos.x, cell.pos.y, cell.radius + 260);

        for (let candidateIndex = 0; candidateIndex < nearby.length; candidateIndex += 1) {
          const other = nearby[candidateIndex];

          if (
            other.ownerId !== this.id ||
            other.id === cell.id ||
            removeIds.has(other.id) ||
            removeIds.has(cell.id) ||
            cell.id > other.id
          ) {
            continue;
          }

          const mergeDistance = cell.radius + other.radius;
          const distSq = distanceSquaredPos(cell, other);

          if (distSq > mergeDistance * mergeDistance) {
            continue;
          }

          const canMerge = cell.mergeTimer <= 0 && other.mergeTimer <= 0;

          if (canMerge) {
            this.mergeCells(cell, other, removeIds);
            continue;
          }

          const distance = Math.sqrt(Math.max(0.0001, distSq));
          const overlap = mergeDistance - distance + PLAYER_CONFIG.softCollisionPadding;

          if (overlap <= 0) {
            continue;
          }

          const nx = (other.pos.x - cell.pos.x) / distance;
          const ny = (other.pos.y - cell.pos.y) / distance;
          const totalMass = cell.mass + other.mass;
          const cellWeight = other.mass / totalMass;
          const otherWeight = cell.mass / totalMass;
          const correction = Math.min(overlap * PLAYER_CONFIG.softCollisionPush, maxPush);

          cell.pos.x -= nx * correction * cellWeight;
          cell.pos.y -= ny * correction * cellWeight;
          other.pos.x += nx * correction * otherWeight;
          other.pos.y += ny * correction * otherWeight;

          cell.vel.x *= damping;
          cell.vel.y *= damping;
          other.vel.x *= damping;
          other.vel.y *= damping;

          world.clampEntity(cell);
          world.clampEntity(other);
        }
      }
    }

    if (removeIds.size > 0) {
      this.removeCellsByIds(removeIds);
    }
  }

  mergeCells(cell, other, removeIds) {
    const primary = cell.mass >= other.mass ? cell : other;
    const secondary = primary === cell ? other : cell;

    if (removeIds.has(primary.id) || removeIds.has(secondary.id)) {
      return;
    }

    const totalMass = primary.mass + secondary.mass;

    primary.vel.x = (primary.vel.x * primary.mass + secondary.vel.x * secondary.mass) / totalMass;
    primary.vel.y = (primary.vel.y * primary.mass + secondary.vel.y * secondary.mass) / totalMass;
    primary.pos.x = (primary.pos.x * primary.mass + secondary.pos.x * secondary.mass) / totalMass;
    primary.pos.y = (primary.pos.y * primary.mass + secondary.pos.y * secondary.mass) / totalMass;
    primary.setMass(totalMass);
    primary.mergeTimer = 0;

    removeIds.add(secondary.id);
  }

  getCenterOfMass() {
    let sumX = 0;
    let sumY = 0;
    let totalMass = 0;

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];
      sumX += cell.pos.x * cell.mass;
      sumY += cell.pos.y * cell.mass;
      totalMass += cell.mass;
    }

    if (totalMass <= 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: sumX / totalMass,
      y: sumY / totalMass,
    };
  }

  getTotalMass() {
    let total = 0;

    for (let index = 0; index < this.cells.length; index += 1) {
      total += this.cells[index].mass;
    }

    return total;
  }

  getLargestRadius() {
    let largest = 0;

    for (let index = 0; index < this.cells.length; index += 1) {
      largest = Math.max(largest, this.cells[index].radius);
    }

    return largest;
  }
}
