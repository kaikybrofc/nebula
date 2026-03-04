import Camera from './Camera';
import Input from './Input';
import Renderer from './Renderer';
import NetClient from './net/NetClient';
import RemoteState from './net/RemoteState';
import { GAME_SETTINGS_DEFAULTS, PLAYER_CONFIG, WORLD_CONFIG } from '../shared/config';

const SEND_RATE = 1 / 30;
const HUD_UPDATE_INTERVAL = 0.1;
const FPS_UPDATE_INTERVAL = 0.4;
const MAX_FRAME_DELTA = 0.1;

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

    this.remoteState = new RemoteState();
    this.netClient = new NetClient({
      onSnapshot: (snapshot) => {
        this.remoteState.applySnapshot(snapshot);
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

    this.sendTimer = 0;
    this.inputSeq = 0;
    this.hudTimer = 0;

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

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.input.connect();
    this.netClient.connect(this.nickname);

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

    this.updateCamera(frameDelta);
    this.updateFpsCounter(frameDelta);

    this.hudTimer += frameDelta;
    if (this.hudTimer >= HUD_UPDATE_INTERVAL) {
      this.hudTimer = 0;
      this.publishStats();
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  sendInput() {
    const direction = this.input.getNormalizedScreenDirection();
    const scaledX = direction.x * this.settings.sensitivity;
    const scaledY = direction.y * this.settings.sensitivity;
    const length = Math.hypot(scaledX, scaledY);
    const dx = length > 1 ? scaledX / length : scaledX;
    const dy = length > 1 ? scaledY / length : scaledY;

    this.netClient.sendInput({
      seq: this.inputSeq,
      dx,
      dy,
      split: this.input.consumeSplit(),
      eject: this.input.isEjectHeld(),
    });

    this.inputSeq += 1;
  }

  updateCamera(deltaTime) {
    const local = this.remoteState.getLocalAggregate();

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

  render() {
    this.renderer.render(this.remoteState);
  }

  publishStats() {
    if (!this.onStatsChange) {
      return;
    }

    const local = this.remoteState.getLocalAggregate();

    this.onStatsChange({
      mass: local ? local.mass : PLAYER_CONFIG.initialMass,
      radius: local ? local.largestRadius : 0,
      foodCount: this.remoteState.foods.length,
      pelletCount: this.remoteState.pellets.length,
      cellCount: local ? local.cellCount : 0,
      fps: this.currentFps,
      score: local ? Math.max(0, local.mass - PLAYER_CONFIG.initialMass) : 0,
      leaderboard: this.remoteState.leaderboard,
      playerRank: Math.max(
        1,
        this.remoteState.leaderboard.findIndex((entry) => entry.id === this.remoteState.selfId) + 1,
      ),
    });
  }
}
