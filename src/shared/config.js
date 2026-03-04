export const WORLD_CONFIG = {
  width: 5000,
  height: 5000,
  initialFoodCount: 1200,
  foodSpawnMargin: 24,
};

export const PLAYER_CONFIG = {
  initialMass: 45,
  referenceMass: 45,
  baseSpeed: 360,
  minSpeed: 95,
  maxSpeed: 430,
  speedExponent: 0.36,
  massGainFactor: 1,
  color: '#5fd3bc',
  strokeColor: '#2d9f8a',
};

export const FOOD_CONFIG = {
  minMass: 1,
  maxMass: 3,
  colors: ['#ffe07a', '#7ae8ff', '#ffa87a', '#c4ff8a', '#ff9dd2'],
};

export const CAMERA_CONFIG = {
  baseZoom: 1,
  minZoom: 0.32,
  maxZoom: 1.35,
  referenceMass: 45,
  zoomExponent: 0.12,
  followSharpness: 10,
  zoomSharpness: 6,
};

export const RENDER_CONFIG = {
  background: '#041624',
  worldFill: '#062033',
  worldBorder: '#1e4f67',
  gridMinor: '#0f2f44',
  gridMajor: '#17455e',
  gridSize: 100,
};
