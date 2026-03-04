let entityCounter = 0;

export function createEntityId(prefix = 'e') {
  entityCounter += 1;
  return `${prefix}_${entityCounter}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function massToRadius(mass) {
  return Math.sqrt(mass) * 4;
}

export function radiusToMass(radius) {
  return (radius / 4) * (radius / 4);
}

export function magnitude(x, y) {
  return Math.hypot(x, y);
}

export function normalize(x, y, fallbackX = 1, fallbackY = 0) {
  const length = magnitude(x, y);

  if (length <= 0.0001) {
    return { x: fallbackX, y: fallbackY };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

export function limitVector(vector, maxLength) {
  const length = magnitude(vector.x, vector.y);

  if (length <= maxLength || length === 0) {
    return;
  }

  const ratio = maxLength / length;
  vector.x *= ratio;
  vector.y *= ratio;
}

export function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function distanceSquaredPos(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  return dx * dx + dy * dy;
}

export function applyExponentialDrag(vector, drag, deltaTime) {
  const damping = Math.exp(-drag * deltaTime);
  vector.x *= damping;
  vector.y *= damping;
}
