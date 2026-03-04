export default class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 0;
    this.mouseY = 0;

    this.pendingSplit = false;
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

  getWorldMouse(camera) {
    return camera.screenToWorld(this.mouseX, this.mouseY);
  }
}
