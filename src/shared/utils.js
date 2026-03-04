export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function massToRadius(mass) {
  return Math.sqrt(mass) * 4;
}
