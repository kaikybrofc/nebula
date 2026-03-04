import { MOVE_CONFIG } from '../shared/config';
import { clamp } from '../shared/utils';

export default class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 0;
    this.mouseY = 0;

    this.pendingSplit = false;
    this.splitHeld = false;
    this.ejectHeld = false;

    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  connect() {
    this.centerMouse();
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  disconnect() {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.splitHeld = false;
    this.ejectHeld = false;
    this.pendingSplit = false;
  }

  centerMouse() {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = rect.width / 2;
    this.mouseY = rect.height / 2;
  }

  handlePointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();

    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
  }

  handleKeyDown(event) {
    if (event.code === 'Space') {
      this.splitHeld = true;
      if (!event.repeat) {
        this.pendingSplit = true;
      }
      event.preventDefault();
      return;
    }

    if (event.code === 'KeyW') {
      this.ejectHeld = true;
      event.preventDefault();
    }
  }

  handleKeyUp(event) {
    if (event.code === 'Space') {
      this.splitHeld = false;
      return;
    }

    if (event.code === 'KeyW') {
      this.ejectHeld = false;
    }
  }

  consumeSplit() {
    const shouldSplit = this.pendingSplit;
    this.pendingSplit = false;
    return shouldSplit;
  }

  isEjectHeld() {
    return this.ejectHeld;
  }

  isSplitHeld() {
    return this.splitHeld;
  }

  getWorldMouse(camera) {
    return camera.screenToWorld(this.mouseX, this.mouseY);
  }

  getNormalizedScreenDirection() {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width * 0.5;
    const centerY = rect.height * 0.5;
    const dx = this.mouseX - centerX;
    const dy = this.mouseY - centerY;
    const length = Math.hypot(dx, dy);
    const maxDistance = Math.max(1, Math.min(rect.width, rect.height) * 0.5);
    const deadzonePixels = Math.max(5, maxDistance * MOVE_CONFIG.joystickDeadzone * 0.22);

    if (length <= deadzonePixels) {
      return { x: 0, y: 0 };
    }

    const normalizedMagnitude = clamp(
      (Math.min(maxDistance, length) - deadzonePixels) / (maxDistance - deadzonePixels),
      0,
      1,
    );

    return {
      x: (dx / length) * normalizedMagnitude,
      y: (dy / length) * normalizedMagnitude,
    };
  }
}
