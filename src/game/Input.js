export default class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 0;
    this.mouseY = 0;

    this.handlePointerMove = this.handlePointerMove.bind(this);
  }

  connect() {
    this.centerMouse();
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
  }

  disconnect() {
    window.removeEventListener('pointermove', this.handlePointerMove);
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

  getWorldMouse(camera) {
    return camera.screenToWorld(this.mouseX, this.mouseY);
  }
}
