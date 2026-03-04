function resolveSocketUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3001`;
}

export default class NetClient {
  constructor({ onSnapshot, onOpen, onClose, onError }) {
    this.socket = null;
    this.onSnapshot = onSnapshot;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
  }

  connect(nickname) {
    if (this.socket) {
      this.close();
    }

    this.socket = new WebSocket(resolveSocketUrl());

    this.socket.addEventListener('open', () => {
      this.sendRaw({
        type: 'join',
        nickname,
      });

      if (this.onOpen) {
        this.onOpen();
      }
    });

    this.socket.addEventListener('message', (event) => {
      let payload;

      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (
        (payload.type === 'snapshot' ||
          payload.type === 'snapshot_full' ||
          payload.type === 'snapshot_delta') &&
        this.onSnapshot
      ) {
        this.onSnapshot(payload);
      }
    });

    this.socket.addEventListener('error', (event) => {
      if (this.onError) {
        this.onError(event);
      }
    });

    this.socket.addEventListener('close', () => {
      if (this.onClose) {
        this.onClose();
      }
    });
  }

  sendInput(input) {
    this.sendRaw({
      type: 'input',
      ...input,
    });
  }

  sendRaw(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }

  close() {
    if (!this.socket) {
      return;
    }

    this.socket.close();
    this.socket = null;
  }
}
