import { EJECT_CONFIG, PLAYER_CONFIG, SPLIT_CONFIG } from '../../shared/config.js';
import { massToRadius, normalize } from '../../shared/utils.js';

const EPSILON = 0.0001;

function msToSeconds(valueMs) {
  return Math.max(0, valueMs) / 1000;
}

function stableStringHash(value) {
  const text = String(value ?? '');
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function hashToUnit(seed) {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

function rotateVector(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function getSortedCells(cells) {
  return [...cells].sort((left, right) => {
    if (right.mass !== left.mass) {
      return right.mass - left.mass;
    }

    return String(left.id).localeCompare(String(right.id));
  });
}

export function getMergeLockSeconds(mass, splitConfig = SPLIT_CONFIG) {
  return msToSeconds(splitConfig.mergeLockBaseMs + mass * splitConfig.mergeLockMassFactor);
}

export function resolveActionDirection(inputDirection, aimDirection) {
  const inputLength = Math.hypot(inputDirection.x, inputDirection.y);

  if (inputLength > EPSILON) {
    return {
      x: inputDirection.x / inputLength,
      y: inputDirection.y / inputLength,
    };
  }

  const aimLength = Math.hypot(aimDirection.x, aimDirection.y);

  if (aimLength > EPSILON) {
    return {
      x: aimDirection.x / aimLength,
      y: aimDirection.y / aimLength,
    };
  }

  return { x: 1, y: 0 };
}

export function applySplit({
  actor,
  splitRequested,
  inputDirection,
  setCellMass,
  createCell,
  clampCell,
  ownerId,
  nickname,
  color,
  strokeColor,
  splitConfig = SPLIT_CONFIG,
  minCellMass = PLAYER_CONFIG.minCellMass,
}) {
  if (!splitRequested) {
    actor.splitHeld = false;
    return [];
  }

  if (!splitConfig.chainSplitAllow && actor.splitHeld) {
    return [];
  }

  actor.splitHeld = true;

  if (actor.splitCooldown > 0 || actor.cells.length >= splitConfig.maxCells) {
    return [];
  }

  const direction = resolveActionDirection(inputDirection, actor.aim);
  const spawned = [];
  const candidates = getSortedCells(actor.cells);

  for (let index = 0; index < candidates.length; index += 1) {
    const cell = candidates[index];

    if (actor.cells.length + spawned.length >= splitConfig.maxCells) {
      break;
    }

    if (cell.mass < splitConfig.minMassToSplit) {
      continue;
    }

    const childMass = cell.mass * splitConfig.splitMassRatio;
    const parentMass = cell.mass - childMass;

    if (childMass < minCellMass || parentMass < minCellMass) {
      continue;
    }

    setCellMass(cell, parentMass);
    cell.mergeTimer = Math.max(cell.mergeTimer || 0, getMergeLockSeconds(cell.mass, splitConfig));
    cell.splitBoostTimer = 0;

    const childRadius = massToRadius(childMass);
    const spawnDistance = cell.radius + childRadius + 3;
    const child = createCell({
      x: cell.pos.x + direction.x * spawnDistance,
      y: cell.pos.y + direction.y * spawnDistance,
      mass: childMass,
      ownerId,
      nickname,
      color,
      strokeColor,
      vx: cell.vel.x + direction.x * splitConfig.splitImpulse,
      vy: cell.vel.y + direction.y * splitConfig.splitImpulse,
    });

    child.mergeTimer = getMergeLockSeconds(child.mass, splitConfig);
    child.spawnProtection = msToSeconds(splitConfig.splitSpawnProtectionMs);
    child.splitBoostTimer = msToSeconds(splitConfig.splitBoostDurationMs);
    child.splitBoostDecay = splitConfig.splitImpulseDecay;

    if (clampCell) {
      clampCell(child);
    }

    spawned.push(child);
  }

  if (spawned.length === 0) {
    return [];
  }

  actor.cells.push(...spawned);
  actor.splitCooldown = msToSeconds(splitConfig.splitCooldownMs);

  return spawned;
}

export function applyEject({
  actor,
  ejectRequested,
  inputDirection,
  sequence = 0,
  setCellMass,
  createPellet,
  clampPellet,
  ownerId,
  ejectConfig = EJECT_CONFIG,
  minCellMass = PLAYER_CONFIG.minCellMass,
}) {
  if (!ejectRequested) {
    return [];
  }

  if (actor.ejectCooldown > 0) {
    return [];
  }

  const pellets = [];
  const baseDirection = resolveActionDirection(inputDirection, actor.aim);
  const spreadRadians = (ejectConfig.ejectSpreadAngleDeg * Math.PI) / 180;
  const ownerSeed = stableStringHash(ownerId);
  const candidates = getSortedCells(actor.cells);

  for (let index = 0; index < candidates.length; index += 1) {
    const cell = candidates[index];
    const minRequiredMass = ejectConfig.minMassToEject + ejectConfig.ejectMassCost;

    if (cell.mass < minRequiredMass) {
      continue;
    }

    const nextMass = cell.mass - ejectConfig.ejectMassCost;

    if (nextMass < minCellMass) {
      continue;
    }

    setCellMass(cell, nextMass);

    let dirX = baseDirection.x;
    let dirY = baseDirection.y;

    if (ejectConfig.ejectWhileMovingBias) {
      const movingDirection = normalize(cell.vel.x, cell.vel.y, dirX, dirY);
      dirX = dirX * 0.84 + movingDirection.x * 0.16;
      dirY = dirY * 0.84 + movingDirection.y * 0.16;
      const normalized = normalize(dirX, dirY, baseDirection.x, baseDirection.y);
      dirX = normalized.x;
      dirY = normalized.y;
    }

    const spreadSeed =
      (Number(sequence) + 1) * 73856093 ^
      (index + 1) * 19349663 ^
      ownerSeed ^
      stableStringHash(cell.id);
    const spreadUnit = hashToUnit(spreadSeed);
    const spreadAngle = (spreadUnit * 2 - 1) * spreadRadians;
    const spreadDirection = rotateVector(dirX, dirY, spreadAngle);

    const pelletRadius = massToRadius(ejectConfig.ejectPelletMass) * 0.62;
    const spawnDistance = cell.radius + pelletRadius + 4;
    const pellet = createPellet({
      ownerId,
      mass: ejectConfig.ejectPelletMass,
      x: cell.pos.x + spreadDirection.x * spawnDistance,
      y: cell.pos.y + spreadDirection.y * spawnDistance,
      vx: spreadDirection.x * ejectConfig.ejectImpulse + cell.vel.x * 0.2,
      vy: spreadDirection.y * ejectConfig.ejectImpulse + cell.vel.y * 0.2,
      pickupDelay: msToSeconds(ejectConfig.pelletPickupDelayMs),
      maxLife: msToSeconds(ejectConfig.pelletMaxLifeMs),
    });

    if (clampPellet) {
      clampPellet(pellet);
    }

    pellets.push(pellet);
  }

  if (pellets.length > 0) {
    actor.ejectCooldown = msToSeconds(ejectConfig.ejectCooldownMs);
  }

  return pellets;
}
