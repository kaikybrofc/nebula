import { WebSocketServer } from 'ws';
import Room from './Room.js';

const PORT = Number(process.env.PORT || 3001);
const TICK_RATE = Number(process.env.TICK_RATE || 30);
const STEP_MS = 1000 / TICK_RATE;
const STEP_SECONDS = 1 / TICK_RATE;

const wss = new WebSocketServer({ port: PORT });
const room = new Room();

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

setInterval(() => {
  room.step(STEP_SECONDS);
  room.broadcastSnapshots();
}, STEP_MS);

console.log(`WS server online at ws://0.0.0.0:${PORT} (${TICK_RATE} ticks/s)`);
