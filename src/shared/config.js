export const WORLD_CONFIG = {
  width: 5000,
  height: 5000,
  initialFoodCount: 2000,
  foodSpawnMargin: 24,
};

export const GRID_CONFIG = {
  cellSize: 96,
};

export const PLAYER_CONFIG = {
  initialMass: 45,
  minCellMass: 18,
  maxCells: 16,
  color: '#5fd3bc',
  strokeColor: '#2d9f8a',

  // Nebulous-like steering: acceleration + drag + mass-based max speed.
  acceleration: 1800,
  friction: 3.8,
  stopDistance: 80,
  aimSharpness: 12,
  referenceMass: 45,
  baseSpeed: 430,
  minSpeed: 85,
  maxSpeed: 460,
  speedExponent: 0.38,

  splitGlobalCooldown: 0.42,
  splitCellCooldown: 0.18,
  minSplitMass: 40,
  splitImpulse: 820,

  mergeBaseDelay: 10,
  mergeMassDelayFactor: 0.05,
  mergeMaxDelay: 20,
  softCollisionPadding: 0.8,
  softCollisionPush: 0.52,

  ejectCooldown: 0.12,
  ejectMass: 6,
  minMassToEject: 30,
  ejectImpulse: 730,
};

export const FOOD_CONFIG = {
  minMass: 1,
  maxMass: 3,
  colors: ['#ffe07a', '#7ae8ff', '#ffa87a', '#c4ff8a', '#ff9dd2'],
};

export const PELLET_CONFIG = {
  drag: 5,
  pickupDelay: 0.35,
  color: '#f3ff9a',
  strokeColor: '#d4e274',
};

export const CAMERA_CONFIG = {
  baseZoom: 1,
  minZoom: 0.3,
  maxZoom: 1.35,
  referenceMass: 45,
  zoomExponent: 0.13,
  followSharpness: 8.5,
  zoomSharpness: 5,
};

export const RENDER_CONFIG = {
  background: '#041624',
  worldFill: '#062033',
  worldBorder: '#42bddc',
  worldBorderGlow: 'rgba(84, 212, 255, 0.72)',
  gridMinor: '#0f2f44',
  gridMajor: '#17455e',
  gridSize: 100,
};

export const GAME_SETTINGS_DEFAULTS = {
  sensitivity: 1,
  zoom: 1,
};
