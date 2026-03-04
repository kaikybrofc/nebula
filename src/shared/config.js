export const WORLD_CONFIG = {
  width: 5000,
  height: 5000,
  initialFoodCount: 600,
  foodSpawnMargin: 24,
};

export const MOVE_CONFIG = {
  // Nebulous-like movement: quick response + smooth inertia.
  baseSpeed: 420,
  accel: 2600,
  drag: 6.5,
  speedExponent: 0.3,
  inputSmoothing: 0.26,
  dirSmooth: 0.26,
  maxTurnRateDeg: 480,
  joystickDeadzone: 0.1,
  joystickSmoothing: 0.38,
  snapVel: 0.02,
  snapVelThreshold: 0.02,
  referenceMass: 45,
  minSpeed: 80,
  maxSpeed: 420,
};

export const GRID_CONFIG = {
  cellSize: 96,
};

export const NET_CONFIG = {
  tps: 30,
  interpDelayMs: 120,
  maxBufferedSnapshots: 90,
};

export const NET_VISUAL = {
  VISUAL_FOLLOW_LOCAL: 0.14,
  VISUAL_FOLLOW_REMOTE: 1,
  SNAP_ERR_THRESHOLD: 32,
  SNAP_TELEPORT_THRESHOLD: 320,
};

export const ARROW_CONFIG = {
  ARROW_ENABLED: true,
  ARROW_SMOOTH: 0.35,
  ARROW_FADE_IN: 0.18,
  ARROW_FADE_OUT: 0.12,
};

export const VIEW_RADIUS_BASE = 1100;
export const VIEW_RADIUS_MULTIPLIER = 1.15;
export const NET_DELTA_ENABLED = true;
export const NET_DELTA_QUANTIZE_POS = 1;
export const NET_DELTA_QUANTIZE_RADIUS = 0.1;
export const NET_DELTA_QUANTIZE_MASS = 0.1;
export const NET_PREDICTION_ENABLED = true;
export const NET_RECONCILE_SMOOTHING = 0.2;
export const NET_SNAP_THRESHOLD = 140;

export const SIM_CONFIG = {
  seed: 133742,
  maxFrameDelta: 0.1,
  fixedTimeStep: 1 / 60,
};

export const COMBAT_CONFIG = {
  eatMassThreshold: 1.15,
  eatOverlapFactor: 0.2,
  spawnProtectionSeconds: 0.5,
};

export const SPLIT_CONFIG = {
  minMassToSplit: 36,
  splitMassRatio: 0.5,
  maxCells: 16,
  splitCooldownMs: 250,
  splitImpulse: 1200,
  splitImpulseDecay: 10,
  splitBoostDurationMs: 200,
  splitSpawnProtectionMs: 500,
  mergeLockBaseMs: 6000,
  mergeLockMassFactor: 15,
  chainSplitAllow: true,
};

export const EJECT_CONFIG = {
  minMassToEject: 20,
  ejectMassCost: 12,
  ejectPelletMass: 12,
  ejectCooldownMs: 120,
  ejectImpulse: 900,
  ejectSpreadAngleDeg: 6,
  pelletPickupDelayMs: 300,
  pelletMaxLifeMs: 12000,
  ejectWhileMovingBias: true,
};

export const PLAYER_CONFIG = {
  initialMass: 45,
  minCellMass: 18,
  color: '#5fd3bc',
  strokeColor: '#2d9f8a',
  softCollisionPadding: 0.8,
  softCollisionPush: 0.52,
  softCollisionMaxPush: 18,
  softCollisionDamping: 0.1,
  softCollisionIterations: 2,
};

export const BOT_CONFIG = {
  count: 10,
  initialMass: 45,
  respawnDelay: 2,
  decisionIntervalMin: 0.12,
  decisionIntervalMax: 0.24,
  visionRange: 620,
  chaseMassRatio: 1.3,
  fearMassRatio: 1.08,
  fleeDistance: 420,
  wanderDistanceMin: 180,
  wanderDistanceMax: 440,
  colorPalette: [
    { color: '#ff9a8d', stroke: '#de6658' },
    { color: '#ffd180', stroke: '#d7a04b' },
    { color: '#a9ff9a', stroke: '#6fca6d' },
    { color: '#8cc8ff', stroke: '#4f90ce' },
    { color: '#d6a7ff', stroke: '#9a68cc' },
    { color: '#ffb4de', stroke: '#c973aa' },
  ],
};

export const FOOD_CONFIG = {
  minMass: 1,
  maxMass: 3,
  colors: ['#ffe07a', '#7ae8ff', '#ffa87a', '#c4ff8a', '#ff9dd2'],
};

export const PELLET_CONFIG = {
  drag: 5,
  pickupDelay: EJECT_CONFIG.pelletPickupDelayMs / 1000,
  maxLife: EJECT_CONFIG.pelletMaxLifeMs / 1000,
  color: '#f3ff9a',
  strokeColor: '#d4e274',
};

export const CAMERA_CONFIG = {
  baseZoom: 1,
  minZoom: 0.3,
  maxZoom: 1.35,
  referenceMass: 45,
  zoomExponent: 0.13,
  followSmoothing: 0.3,
  zoomSmoothing: 0.24,
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
  graphicsQuality: 1,
  showLeaderboard: true,
  showMinimap: true,
  showFps: true,
  soundEnabled: true,
};
