import Camera from './Camera';
import Input from './Input';
import Renderer from './Renderer';
import VisualState from './VisualState';
import NetClient from './net/NetClient';
import PredictedState from './net/PredictedState';
import RemoteState from './net/RemoteState';
import {
  ARROW_CONFIG,
  GAME_SETTINGS_DEFAULTS,
  NET_CONFIG,
  NET_PREDICTION_ENABLED,
  PLAYER_CONFIG,
  WORLD_CONFIG,
} from '../shared/config';
import { lerp, magnitude } from '../shared/utils';

const SEND_RATE = 1 / NET_CONFIG.tps;
const HUD_UPDATE_INTERVAL = 0.1;
const FPS_UPDATE_INTERVAL = 0.4;
const MAX_FRAME_DELTA = 0.1;

function aggregateOwnerBlobs(blobs, ownerId) {
  if (!ownerId) {
    return null;
  }

  let totalMass = 0;
  let sumX = 0;
  let sumY = 0;
  let largestRadius = 0;
  let cellCount = 0;

  for (let index = 0; index < blobs.length; index += 1) {
    const blob = blobs[index];

    if (blob.ownerId !== ownerId) {
      continue;
    }

    const mass = typeof blob.mass === 'number' ? blob.mass : 0;
    totalMass += mass;
    sumX += blob.x * mass;
    sumY += blob.y * mass;
    largestRadius = Math.max(largestRadius, blob.r || 0);
    cellCount += 1;
  }

  if (cellCount === 0 || totalMass <= 0) {
    return null;
  }

  return {
    x: sumX / totalMass,
    y: sumY / totalMass,
    mass: totalMass,
    largestRadius,
    cellCount,
  };
}

export default class Game {
  constructor(canvas, { nickname, onStatsChange, settings = GAME_SETTINGS_DEFAULTS }) {
    this.canvas = canvas;
    this.nickname = nickname;
    this.onStatsChange = onStatsChange;

    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });

    if (!context) {
      throw new Error('Could not create 2D context for the game canvas.');
    }

    this.context = context;
    this.camera = new Camera();
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas, context, this.camera, {
      width: WORLD_CONFIG.width,
      height: WORLD_CONFIG.height,
    });
    this.visualState = new VisualState();

    this.remoteState = new RemoteState();
    this.predictedState = new PredictedState();
    this.netClient = new NetClient({
      onSnapshot: (snapshot) => {
        this.handleServerSnapshot(snapshot);
      },
    });

    this.settings = {
      sensitivity: GAME_SETTINGS_DEFAULTS.sensitivity,
      zoom: GAME_SETTINGS_DEFAULTS.zoom,
    };
    this.setSettings(settings);

    this.running = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.currentFrame = {
      tick: 0,
      blobs: [],
      foods: [],
      pellets: [],
    };

    this.sendTimer = 0;
    this.inputSeq = 0;
    this.hudTimer = 0;
    this.virtualDirection = { x: 0, y: 0 };
    this.virtualDirectionActive = false;
    this.virtualSplitQueued = false;
    this.virtualSplitActive = false;
    this.virtualEjectActive = false;
    this.lastDesiredDirection = { x: 0, y: 0 };
    this.arrowDirection = { x: 1, y: 0 };
    this.arrowAlpha = 0;

    this.currentFps = 0;
    this.fpsTimer = 0;
    this.fpsFrameCount = 0;

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
  }

  setSettings(nextSettings = {}) {
    this.settings = {
      sensitivity: nextSettings.sensitivity ?? this.settings.sensitivity,
      zoom: nextSettings.zoom ?? this.settings.zoom,
    };
  }

  setVirtualDirection(x = 0, y = 0) {
    const nextX = Number(x) || 0;
    const nextY = Number(y) || 0;
    const length = Math.hypot(nextX, nextY);

    if (length < 0.001) {
      this.virtualDirectionActive = false;
      this.virtualDirection.x = 0;
      this.virtualDirection.y = 0;
      return;
    }

    const scale = length > 1 ? 1 / length : 1;
    this.virtualDirectionActive = true;
    this.virtualDirection.x = nextX * scale;
    this.virtualDirection.y = nextY * scale;
  }

  triggerSplit() {
    this.virtualSplitQueued = true;
  }

  setSplitActive(isActive) {
    this.virtualSplitActive = Boolean(isActive);
  }

  setEjectActive(isActive) {
    this.virtualEjectActive = Boolean(isActive);
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.input.connect();
    this.netClient.connect(this.nickname);
    this.visualState.reset();

    window.addEventListener('resize', this.resize);
    this.resize();

    this.publishStats();
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('resize', this.resize);
    this.input.disconnect();
    this.netClient.close();
    this.predictedState.reset();
    this.visualState.reset();
    this.virtualDirectionActive = false;
    this.virtualDirection.x = 0;
    this.virtualDirection.y = 0;
    this.virtualSplitQueued = false;
    this.virtualSplitActive = false;
    this.virtualEjectActive = false;
    this.lastDesiredDirection.x = 0;
    this.lastDesiredDirection.y = 0;
    this.arrowDirection.x = 1;
    this.arrowDirection.y = 0;
    this.arrowAlpha = 0;
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    this.renderer.resize(width, height, dpr);
    this.camera.setViewport(width, height);
    this.input.centerMouse();
  }

  tick(timestamp) {
    if (!this.running) {
      return;
    }

    const frameDelta = Math.min((timestamp - this.lastFrameTime) / 1000, MAX_FRAME_DELTA);
    this.lastFrameTime = timestamp;

    this.sendTimer += frameDelta;
    while (this.sendTimer >= SEND_RATE) {
      this.sendInput();
      this.sendTimer -= SEND_RATE;
    }

    const selfId = this.remoteState.getSelfId();
    const simFrame = this.buildRenderFrame(this.remoteState.getInterpolatedFrame());
    this.currentFrame = this.visualState.buildFrame(simFrame, frameDelta, selfId);
    this.updateCamera(this.currentFrame, frameDelta);
    this.updateFpsCounter(frameDelta);
    const arrowIndicator = this.buildLocalArrowIndicator(this.currentFrame, frameDelta);

    this.hudTimer += frameDelta;
    if (this.hudTimer >= HUD_UPDATE_INTERVAL) {
      this.hudTimer = 0;
      this.publishStats();
    }

    this.render(this.currentFrame, arrowIndicator);
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  sendInput() {
    const pointerDirection = this.input.getNormalizedScreenDirection();
    const direction = this.virtualDirectionActive ? this.virtualDirection : pointerDirection;
    const scaledX = direction.x * this.settings.sensitivity;
    const scaledY = direction.y * this.settings.sensitivity;
    const length = Math.hypot(scaledX, scaledY);
    const dx = length > 1 ? scaledX / length : scaledX;
    const dy = length > 1 ? scaledY / length : scaledY;
    const split =
      this.input.consumeSplit() ||
      this.input.isSplitHeld() ||
      this.virtualSplitQueued ||
      this.virtualSplitActive;
    const eject = this.input.isEjectHeld() || this.virtualEjectActive;
    this.lastDesiredDirection.x = dx;
    this.lastDesiredDirection.y = dy;
    this.virtualSplitQueued = false;

    const inputPayload = {
      seq: this.inputSeq,
      dx,
      dy,
      split,
      eject,
    };

    this.netClient.sendInput(inputPayload);

    if (NET_PREDICTION_ENABLED) {
      this.predictedState.applyLocalInput(inputPayload, SEND_RATE);
    }

    this.inputSeq += 1;
  }

  handleServerSnapshot(snapshot) {
    this.remoteState.applySnapshot(snapshot);

    if (!NET_PREDICTION_ENABLED) {
      return;
    }

    this.predictedState.reconcile({
      selfId: this.remoteState.getSelfId(),
      authoritativeBlobs: this.remoteState.getLatestLocalBlobs(),
      ackSeq: this.remoteState.getLatestAckSeq(),
    });
  }

  buildRenderFrame(interpolatedFrame) {
    if (!NET_PREDICTION_ENABLED || !this.predictedState.hasReadyState()) {
      return interpolatedFrame;
    }

    const selfId = this.remoteState.getSelfId();

    if (!selfId) {
      return interpolatedFrame;
    }

    const predictedBlobs = this.predictedState.getRenderBlobs();

    if (predictedBlobs.length === 0) {
      return interpolatedFrame;
    }

    const remoteNonLocalBlobs = interpolatedFrame.blobs.filter((blob) => blob.ownerId !== selfId);

    return {
      ...interpolatedFrame,
      blobs: [...remoteNonLocalBlobs, ...predictedBlobs],
    };
  }

  updateCamera(frame, deltaTime) {
    const selfId = this.remoteState.getSelfId();
    const local =
      aggregateOwnerBlobs(frame.blobs, selfId) ||
      (NET_PREDICTION_ENABLED ? this.predictedState.getAggregate() : null) ||
      this.remoteState.getLocalAggregateFromFrame(frame);

    if (!local) {
      return;
    }

    this.camera.update(
      {
        x: local.x,
        y: local.y,
        mass: local.mass,
      },
      deltaTime,
      this.settings.zoom,
    );
  }

  updateFpsCounter(frameDelta) {
    this.fpsFrameCount += 1;
    this.fpsTimer += frameDelta;

    if (this.fpsTimer < FPS_UPDATE_INTERVAL) {
      return;
    }

    this.currentFps = Math.round(this.fpsFrameCount / this.fpsTimer);
    this.fpsTimer = 0;
    this.fpsFrameCount = 0;
  }

  buildLocalArrowIndicator(frame, deltaTime) {
    if (!ARROW_CONFIG.ARROW_ENABLED) {
      return null;
    }

    const selfId = this.remoteState.getSelfId();
    const local = aggregateOwnerBlobs(frame.blobs, selfId);

    if (!local) {
      this.arrowAlpha = 0;
      return null;
    }

    const sourceDirection =
      NET_PREDICTION_ENABLED && this.predictedState.hasReadyState()
        ? this.predictedState.getInputDirection()
        : this.lastDesiredDirection;
    const sourceLength = magnitude(sourceDirection.x, sourceDirection.y);
    const hasDirection = sourceLength > 0.0001;
    const dirTargetX = hasDirection ? sourceDirection.x / sourceLength : this.arrowDirection.x;
    const dirTargetY = hasDirection ? sourceDirection.y / sourceLength : this.arrowDirection.y;
    const directionAlpha = 1 - Math.exp(-(ARROW_CONFIG.ARROW_SMOOTH ?? 0.35) * 60 * deltaTime);

    this.arrowDirection.x = lerp(this.arrowDirection.x, dirTargetX, directionAlpha);
    this.arrowDirection.y = lerp(this.arrowDirection.y, dirTargetY, directionAlpha);

    const normalizedLength = magnitude(this.arrowDirection.x, this.arrowDirection.y);
    if (normalizedLength > 0.0001) {
      this.arrowDirection.x /= normalizedLength;
      this.arrowDirection.y /= normalizedLength;
    }

    const fadeRate = hasDirection ? ARROW_CONFIG.ARROW_FADE_IN : ARROW_CONFIG.ARROW_FADE_OUT;
    const alphaLerp = 1 - Math.exp(-(fadeRate ?? 0.14) * 60 * deltaTime);
    this.arrowAlpha = lerp(this.arrowAlpha, hasDirection ? 1 : 0, alphaLerp);

    if (this.arrowAlpha <= 0.01) {
      return null;
    }

    return {
      x: local.x,
      y: local.y,
      radius: local.largestRadius,
      dirX: this.arrowDirection.x,
      dirY: this.arrowDirection.y,
      alpha: this.arrowAlpha,
    };
  }

  render(frame, arrowIndicator = null) {
    this.renderer.render(frame, arrowIndicator);
  }

  publishStats() {
    if (!this.onStatsChange) {
      return;
    }

    const local =
      (NET_PREDICTION_ENABLED ? this.predictedState.getAggregate() : null) ||
      this.remoteState.getLatestLocalAggregate();
    const counts = this.remoteState.getLatestCounts();
    const selfId = this.remoteState.getSelfId();

    this.onStatsChange({
      mass: local ? local.mass : PLAYER_CONFIG.initialMass,
      radius: local ? local.largestRadius : 0,
      foodCount: counts.foods,
      pelletCount: counts.pellets,
      cellCount: local ? local.cellCount : 0,
      fps: this.currentFps,
      score: local ? Math.max(0, local.mass - PLAYER_CONFIG.initialMass) : 0,
      leaderboard: this.remoteState.getLatestLeaderboard(),
      playerRank: this.remoteState.getPlayerRank(),
      selfId,
      playerX: local ? local.x : WORLD_CONFIG.width * 0.5,
      playerY: local ? local.y : WORLD_CONFIG.height * 0.5,
      worldWidth: WORLD_CONFIG.width,
      worldHeight: WORLD_CONFIG.height,
    });
  }
}
