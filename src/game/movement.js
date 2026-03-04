import { MOVE_CONFIG } from '../shared/config.js';
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
  const alpha = smoothingToAlpha(MOVE_CONFIG.inputSmoothing, deltaTime);

  currentDirection.x = lerp(currentDirection.x, targetDirection.x, alpha);
  currentDirection.y = lerp(currentDirection.y, targetDirection.y, alpha);

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

  const speed = magnitude(cell.vel.x, cell.vel.y);
  const maxSpeed = getMaxSpeedForMass(cell.mass);

  if (speed > maxSpeed && speed > 0.0001) {
    const ratio = maxSpeed / speed;
    cell.vel.x *= ratio;
    cell.vel.y *= ratio;
  }

  if (
    magnitude(inputDirection.x, inputDirection.y) <= 0.0001 &&
    speed < MOVE_CONFIG.snapToZeroThreshold
  ) {
    cell.vel.x = 0;
    cell.vel.y = 0;
  }
}
