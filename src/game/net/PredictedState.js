import {
  COMBAT_CONFIG,
  NET_PREDICTION_ENABLED,
  NET_SNAP_THRESHOLD,
  PLAYER_CONFIG,
  WORLD_CONFIG,
} from '../../shared/config';
import {
  clamp,
  massToRadius,
} from '../../shared/utils';
import {
  applyMovementForCell,
  normalizeDesiredDirection,
  smoothAim,
  smoothDirection,
} from '../movement.js';

function cloneCell(cell) {
  return {
    ...cell,
    pos: { ...cell.pos },
    vel: { ...cell.vel },
  };
}

function distanceSquaredPositions(left, right) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

export default class PredictedState {
  constructor() {
    this.reset();
  }

  reset() {
    this.selfId = null;
    this.cells = [];
    this.pendingInputs = [];
    this.nextTempCellId = 1;
    this.desiredDir = { x: 0, y: 0 };
    this.inputDir = { x: 0, y: 0 };
    this.aim = { x: 1, y: 0 };
    this.splitCooldown = 0;
    this.ejectCooldown = 0;
    this.lastAckSeq = -1;
    this.nickname = null;
    this.color = PLAYER_CONFIG.color;
    this.stroke = PLAYER_CONFIG.strokeColor;
  }

  hasReadyState() {
    return NET_PREDICTION_ENABLED && Boolean(this.selfId) && this.cells.length > 0;
  }

  reconcile({ selfId, authoritativeBlobs, ackSeq }) {
    if (!NET_PREDICTION_ENABLED || !selfId) {
      return;
    }

    if (this.selfId && this.selfId !== selfId) {
      this.reset();
    }

    const previousById = new Map();

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];
      previousById.set(cell.id, cloneCell(cell));
    }

    this.applyAuthoritativeState(selfId, authoritativeBlobs ?? [], previousById);
    this.acknowledgeInputs(ackSeq);

    const pending = [...this.pendingInputs];

    for (let index = 0; index < pending.length; index += 1) {
      const input = pending[index];
      this.simulateInput(input, input.dt || 0);
    }
  }

  applyLocalInput(input, deltaTime) {
    if (!NET_PREDICTION_ENABLED || !this.selfId) {
      return;
    }

    const normalizedInput = {
      seq: Number(input.seq) || 0,
      dx: Number(input.dx) || 0,
      dy: Number(input.dy) || 0,
      split: Boolean(input.split),
      eject: Boolean(input.eject),
      dt: deltaTime,
    };

    this.pendingInputs.push(normalizedInput);
    this.simulateInput(normalizedInput, deltaTime);
  }

  applyAuthoritativeState(selfId, authoritativeBlobs, previousById) {
    this.selfId = selfId;
    const snapThresholdSq = NET_SNAP_THRESHOLD * NET_SNAP_THRESHOLD;

    if (authoritativeBlobs.length > 0) {
      this.nickname = authoritativeBlobs[0].nickname ?? this.nickname;
      this.color = authoritativeBlobs[0].color ?? this.color;
      this.stroke = authoritativeBlobs[0].stroke ?? this.stroke;
    }

    this.cells = authoritativeBlobs.map((blob) => {
      const previous = previousById.get(blob.id);
      const shouldKeepVelocity =
        previous &&
        distanceSquaredPositions(previous.pos, {
          x: blob.x,
          y: blob.y,
        }) <= snapThresholdSq;

      return {
        id: blob.id,
        ownerId: selfId,
        nickname: blob.nickname ?? this.nickname,
        color: blob.color ?? this.color,
        stroke: blob.stroke ?? this.stroke,
        pos: { x: blob.x, y: blob.y },
        vel: shouldKeepVelocity ? { ...previous.vel } : { x: 0, y: 0 },
        mass: blob.mass,
        radius: blob.r,
        mergeTimer: previous ? previous.mergeTimer : 0,
        splitCooldown: previous ? previous.splitCooldown : 0,
        spawnProtection: previous ? previous.spawnProtection : 0,
      };
    });
  }

  acknowledgeInputs(ackSeq) {
    if (typeof ackSeq !== 'number') {
      return;
    }

    this.lastAckSeq = Math.max(this.lastAckSeq, ackSeq);
    this.pendingInputs = this.pendingInputs.filter((input) => input.seq > this.lastAckSeq);
  }

  simulateInput(input, deltaTime) {
    if (this.cells.length === 0) {
      return;
    }

    this.tickTimers(deltaTime);
    this.updateInputDirection(input, deltaTime);

    if (input.split) {
      this.trySplit();
    }

    if (input.eject) {
      this.tryEject();
    }

    this.updateMovement(deltaTime);
    this.resolveInternalCollisions();
  }

  tickTimers(deltaTime) {
    this.splitCooldown = Math.max(0, this.splitCooldown - deltaTime);
    this.ejectCooldown = Math.max(0, this.ejectCooldown - deltaTime);

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];
      cell.mergeTimer = Math.max(0, cell.mergeTimer - deltaTime);
      cell.splitCooldown = Math.max(0, cell.splitCooldown - deltaTime);
      cell.spawnProtection = Math.max(0, cell.spawnProtection - deltaTime);
    }
  }

  updateInputDirection(rawInput, deltaTime) {
    const desired = normalizeDesiredDirection(rawInput.dx, rawInput.dy);

    this.desiredDir.x = desired.x;
    this.desiredDir.y = desired.y;

    smoothDirection(this.inputDir, this.desiredDir, deltaTime);
    smoothAim(this.aim, this.inputDir, deltaTime);
  }

  updateMovement(deltaTime) {
    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];
      applyMovementForCell(cell, this.inputDir, deltaTime, 1);

      cell.pos.x += cell.vel.x * deltaTime;
      cell.pos.y += cell.vel.y * deltaTime;
      this.clampCell(cell);
    }
  }

  resolveInternalCollisions() {
    if (this.cells.length <= 1) {
      return;
    }

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

        for (let otherIndex = index + 1; otherIndex < this.cells.length; otherIndex += 1) {
          const other = this.cells[otherIndex];

          if (
            !other ||
            other.ownerId !== cell.ownerId ||
            removeIds.has(other.id) ||
            removeIds.has(cell.id)
          ) {
            continue;
          }

          const mergeDistance = cell.radius + other.radius;
          const distSq = distanceSquaredPositions(cell.pos, other.pos);

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
          const totalMass = Math.max(1, cell.mass + other.mass);
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

          this.clampCell(cell);
          this.clampCell(other);
        }
      }
    }

    if (removeIds.size > 0) {
      this.cells = this.cells.filter((cell) => !removeIds.has(cell.id));
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
    primary.mass = totalMass;
    primary.radius = massToRadius(totalMass);
    primary.mergeTimer = 0;
    removeIds.add(secondary.id);
  }

  getMergeDelay(mass) {
    return clamp(
      PLAYER_CONFIG.mergeBaseDelay + mass * PLAYER_CONFIG.mergeMassDelayFactor,
      PLAYER_CONFIG.mergeBaseDelay,
      PLAYER_CONFIG.mergeMaxDelay,
    );
  }

  setCellMass(cell, nextMass) {
    cell.mass = Math.max(PLAYER_CONFIG.minCellMass, nextMass);
    cell.radius = massToRadius(cell.mass);
  }

  trySplit() {
    if (this.splitCooldown > 0 || this.cells.length >= PLAYER_CONFIG.maxCells) {
      return false;
    }

    const spawned = [];

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];

      if (cell.mass < PLAYER_CONFIG.minSplitMass || cell.splitCooldown > 0) {
        continue;
      }

      if (this.cells.length + spawned.length >= PLAYER_CONFIG.maxCells) {
        break;
      }

      const splitMass = cell.mass / 2;
      this.setCellMass(cell, splitMass);
      cell.mergeTimer = this.getMergeDelay(cell.mass);
      cell.splitCooldown = PLAYER_CONFIG.splitCellCooldown;

      const childRadius = massToRadius(splitMass);
      const spawnDistance = cell.radius + childRadius + 3;
      const child = {
        id: `pred_${this.nextTempCellId}`,
        ownerId: this.selfId,
        nickname: cell.nickname,
        color: cell.color,
        stroke: cell.stroke,
        pos: {
          x: cell.pos.x + this.aim.x * spawnDistance,
          y: cell.pos.y + this.aim.y * spawnDistance,
        },
        vel: {
          x: cell.vel.x + this.aim.x * PLAYER_CONFIG.splitImpulse,
          y: cell.vel.y + this.aim.y * PLAYER_CONFIG.splitImpulse,
        },
        mass: splitMass,
        radius: childRadius,
        mergeTimer: this.getMergeDelay(splitMass),
        splitCooldown: PLAYER_CONFIG.splitCellCooldown,
        spawnProtection: COMBAT_CONFIG.spawnProtectionSeconds,
      };

      this.nextTempCellId += 1;
      this.clampCell(child);
      spawned.push(child);
    }

    if (spawned.length === 0) {
      return false;
    }

    this.cells.push(...spawned);
    this.splitCooldown = PLAYER_CONFIG.splitGlobalCooldown;
    return true;
  }

  tryEject() {
    if (this.ejectCooldown > 0) {
      return false;
    }

    let ejected = false;

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];

      if (cell.mass < PLAYER_CONFIG.minMassToEject) {
        continue;
      }

      const nextMass = cell.mass - PLAYER_CONFIG.ejectMass;

      if (nextMass < PLAYER_CONFIG.minCellMass) {
        continue;
      }

      this.setCellMass(cell, nextMass);
      ejected = true;
    }

    if (ejected) {
      this.ejectCooldown = PLAYER_CONFIG.ejectCooldown;
    }

    return ejected;
  }

  clampCell(cell) {
    const minX = cell.radius;
    const maxX = WORLD_CONFIG.width - cell.radius;
    const minY = cell.radius;
    const maxY = WORLD_CONFIG.height - cell.radius;

    if (cell.pos.x < minX) {
      cell.pos.x = minX;
      cell.vel.x = Math.max(0, cell.vel.x);
    } else if (cell.pos.x > maxX) {
      cell.pos.x = maxX;
      cell.vel.x = Math.min(0, cell.vel.x);
    }

    if (cell.pos.y < minY) {
      cell.pos.y = minY;
      cell.vel.y = Math.max(0, cell.vel.y);
    } else if (cell.pos.y > maxY) {
      cell.pos.y = maxY;
      cell.vel.y = Math.min(0, cell.vel.y);
    }
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
      return { x: 0, y: 0, mass: 0 };
    }

    return {
      x: sumX / totalMass,
      y: sumY / totalMass,
      mass: totalMass,
    };
  }

  getAggregate() {
    if (this.cells.length === 0) {
      return null;
    }

    const center = this.getCenterOfMass();
    let largestRadius = 0;

    for (let index = 0; index < this.cells.length; index += 1) {
      largestRadius = Math.max(largestRadius, this.cells[index].radius);
    }

    return {
      x: center.x,
      y: center.y,
      mass: center.mass,
      largestRadius,
      cellCount: this.cells.length,
    };
  }

  getRenderBlobs() {
    const blobs = [];

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];
      blobs.push({
        id: cell.id,
        ownerId: cell.ownerId,
        x: cell.pos.x,
        y: cell.pos.y,
        r: cell.radius,
        mass: cell.mass,
        nickname: cell.nickname,
        color: cell.color,
        stroke: cell.stroke,
      });
    }

    return blobs;
  }
}
