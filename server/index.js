import { WebSocketServer } from 'ws';
import Room from './Room.js';
import { NET_CONFIG } from '../src/shared/config.js';

function readBoundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function readBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return fallback;
}

const PORT = Number(process.env.PORT || 3001);
const LEGACY_SERVER_TPS = process.env.SIM_TICK_RATE ?? process.env.TICK_RATE;
const SERVER_TPS = readBoundedNumber(process.env.SERVER_TPS ?? LEGACY_SERVER_TPS, NET_CONFIG.tps, 15, 60);
const SNAPSHOT_HZ = readBoundedNumber(
  process.env.SNAPSHOT_HZ ?? process.env.SNAPSHOT_RATE,
  Math.min(30, SERVER_TPS),
  5,
  SERVER_TPS,
);
const SIM_LOOP_RATE = readBoundedNumber(process.env.SIM_LOOP_RATE, Math.min(240, SERVER_TPS * 4), SERVER_TPS, 240);
const LOG_SERVER_RATES = readBoolean(process.env.LOG_SERVER_RATES, false);
const RATE_LOG_INTERVAL_MS = readBoundedNumber(process.env.RATE_LOG_INTERVAL_MS, 5000, 1000, 60000);
const STEP_MS = 1000 / SERVER_TPS;
const STEP_SECONDS = 1 / SERVER_TPS;
const SNAPSHOT_MS = 1000 / SNAPSHOT_HZ;
const SIM_LOOP_MS = 1000 / SIM_LOOP_RATE;
const MAX_SIM_STEPS_PER_PULSE = Math.max(4, Math.ceil(SERVER_TPS / SIM_LOOP_RATE) * 4);

const wss = new WebSocketServer({ port: PORT });
const room = new Room({ tickRate: SERVER_TPS });

wss.on('connection', (socket) => {
  socket.on('message', (rawData) => {
    let payload;

    try {
      payload = JSON.parse(String(rawData));
    } catch {
      return;
    }

    if (payload.type === 'join') {
      room.addClient(socket, payload.nickname);
      return;
    }

    if (payload.type === 'input') {
      room.updateInput(socket, payload);
    }
  });

  socket.on('close', () => {
    room.removeClient(socket);
  });
});

let simAccumulatorMs = 0;
let lastSimPulseMs = performance.now();
let simStepsSinceLastLog = 0;
let snapshotsSinceLastLog = 0;

setInterval(() => {
  const nowMs = performance.now();
  const elapsedMs = Math.max(0, nowMs - lastSimPulseMs);
  lastSimPulseMs = nowMs;
  simAccumulatorMs += elapsedMs;

  let steps = 0;

  while (simAccumulatorMs >= STEP_MS && steps < MAX_SIM_STEPS_PER_PULSE) {
    room.step(STEP_SECONDS);
    simAccumulatorMs -= STEP_MS;
    steps += 1;
    simStepsSinceLastLog += 1;
  }

  // Prevent unbounded backlog when server is under load.
  if (steps === MAX_SIM_STEPS_PER_PULSE && simAccumulatorMs > STEP_MS * MAX_SIM_STEPS_PER_PULSE) {
    simAccumulatorMs = STEP_MS * MAX_SIM_STEPS_PER_PULSE;
  }
}, SIM_LOOP_MS);

setInterval(() => {
  room.broadcastSnapshots();
  snapshotsSinceLastLog += 1;
}, SNAPSHOT_MS);

if (LOG_SERVER_RATES) {
  setInterval(() => {
    const seconds = RATE_LOG_INTERVAL_MS / 1000;
    const stepsPerSecond = simStepsSinceLastLog / seconds;
    const snapshotsPerSecond = snapshotsSinceLastLog / seconds;
    const inputsPerSecond = room.consumeAcceptedInputCount() / seconds;

    console.log(
      `[rates] sim=${stepsPerSecond.toFixed(1)}/s snapshots=${snapshotsPerSecond.toFixed(1)}/s inputs=${inputsPerSecond.toFixed(1)}/s clients=${room.clients.size}`,
    );

    simStepsSinceLastLog = 0;
    snapshotsSinceLastLog = 0;
  }, RATE_LOG_INTERVAL_MS);
}

console.log(
  `WS server online at ws://0.0.0.0:${PORT} (sim=${SERVER_TPS} tps, snapshots=${SNAPSHOT_HZ}/s, loop=${SIM_LOOP_RATE}/s)`,
);
