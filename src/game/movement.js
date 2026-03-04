import { MOVE_CONFIG, SPLIT_CONFIG } from '../shared/config.js';
import { applyExponentialDrag, clamp, lerp, magnitude } from '../shared/utils.js';

function smoothingToAlpha(smoothing, deltaTime) {
  const normalizedSmoothing = Math.max(0, smoothing);
  return 1 - Math.exp(-normalizedSmoothing * 60 * deltaTime);
}

export function normalizeDesiredDirection(dx, dy, deadzone = MOVE_CONFIG.joystickDeadzone) {
  const length = magnitude(dx, dy);

  if (length <= 0.000001) {
    return { x: 0, y: 0 };
  }

  const clampedLength = Math.min(1, length);

  if (clampedLength <= deadzone) {
    return { x: 0, y: 0 };
  }

  const normalizedX = dx / length;
  const normalizedY = dy / length;
  const remappedMagnitude = clamp((clampedLength - deadzone) / (1 - deadzone), 0, 1);

  return {
    x: normalizedX * remappedMagnitude,
    y: normalizedY * remappedMagnitude,
  };
}

export function smoothDirection(currentDirection, targetDirection, deltaTime) {
  const directionSmoothing = MOVE_CONFIG.dirSmooth ?? MOVE_CONFIG.inputSmoothing;
  const alpha = smoothingToAlpha(directionSmoothing, deltaTime);
  const currentMagnitude = magnitude(currentDirection.x, currentDirection.y);
  const targetMagnitude = magnitude(targetDirection.x, targetDirection.y);
  const nextMagnitude = lerp(currentMagnitude, targetMagnitude, alpha);

  if (nextMagnitude <= 0.0001) {
    currentDirection.x = 0;
    currentDirection.y = 0;
    return;
  }

  const hasCurrentDirection = currentMagnitude > 0.0001;
  const hasTargetDirection = targetMagnitude > 0.0001;
  const currentAngle = hasCurrentDirection
    ? Math.atan2(currentDirection.y, currentDirection.x)
    : hasTargetDirection
      ? Math.atan2(targetDirection.y, targetDirection.x)
      : 0;
  const targetAngle = hasTargetDirection ? Math.atan2(targetDirection.y, targetDirection.x) : currentAngle;
  const maxTurnRadians = ((MOVE_CONFIG.maxTurnRateDeg ?? 480) * Math.PI * deltaTime) / 180;
  let deltaAngle = targetAngle - currentAngle;

  while (deltaAngle > Math.PI) {
    deltaAngle -= Math.PI * 2;
  }

  while (deltaAngle < -Math.PI) {
    deltaAngle += Math.PI * 2;
  }

  const clampedDelta = clamp(deltaAngle, -maxTurnRadians, maxTurnRadians);
  const nextAngle = currentAngle + clampedDelta;

  currentDirection.x = Math.cos(nextAngle) * nextMagnitude;
  currentDirection.y = Math.sin(nextAngle) * nextMagnitude;

  if (Math.abs(currentDirection.x) < 0.0001) {
    currentDirection.x = 0;
  }

  if (Math.abs(currentDirection.y) < 0.0001) {
    currentDirection.y = 0;
  }
}

export function smoothAim(aim, inputDirection, deltaTime) {
  const inputMagnitude = magnitude(inputDirection.x, inputDirection.y);

  if (inputMagnitude <= 0.0001) {
    return;
  }

  const targetX = inputDirection.x / inputMagnitude;
  const targetY = inputDirection.y / inputMagnitude;
  const alpha = smoothingToAlpha(MOVE_CONFIG.inputSmoothing, deltaTime);

  aim.x = lerp(aim.x, targetX, alpha);
  aim.y = lerp(aim.y, targetY, alpha);

  const aimLength = magnitude(aim.x, aim.y);

  if (aimLength > 0.0001) {
    aim.x /= aimLength;
    aim.y /= aimLength;
  } else {
    aim.x = targetX;
    aim.y = targetY;
  }
}

export function getMaxSpeedForMass(mass) {
  const safeMass = Math.max(1, mass);
  const rawSpeed =
    MOVE_CONFIG.baseSpeed / Math.pow(safeMass / MOVE_CONFIG.referenceMass, MOVE_CONFIG.speedExponent);

  return clamp(rawSpeed, MOVE_CONFIG.minSpeed, MOVE_CONFIG.maxSpeed);
}

export function applyMovementForCell(cell, inputDirection, deltaTime, sensitivity = 1) {
  const acceleration = MOVE_CONFIG.accel * Math.max(0, sensitivity);

  cell.vel.x += inputDirection.x * acceleration * deltaTime;
  cell.vel.y += inputDirection.y * acceleration * deltaTime;

  applyExponentialDrag(cell.vel, MOVE_CONFIG.drag, deltaTime);

  // Split starts with a strong impulse and then decays faster for a short window.
  if (cell.splitBoostTimer > 0) {
    cell.splitBoostTimer = Math.max(0, cell.splitBoostTimer - deltaTime);
    const extraDrag = Math.max(0, cell.splitBoostDecay ?? SPLIT_CONFIG.splitImpulseDecay);

    if (extraDrag > 0) {
      applyExponentialDrag(cell.vel, extraDrag, deltaTime);
    }
  }

  const speed = magnitude(cell.vel.x, cell.vel.y);
  const maxSpeed = getMaxSpeedForMass(cell.mass);

  if (speed > maxSpeed && speed > 0.0001) {
    const ratio = maxSpeed / speed;
    cell.vel.x *= ratio;
    cell.vel.y *= ratio;
  }

  if (
    magnitude(inputDirection.x, inputDirection.y) <= 0.0001 &&
    speed < (MOVE_CONFIG.snapVel ?? MOVE_CONFIG.snapVelThreshold ?? MOVE_CONFIG.snapToZeroThreshold ?? 0.01)
  ) {
    cell.vel.x = 0;
    cell.vel.y = 0;
  }
}
