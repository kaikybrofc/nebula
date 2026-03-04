import { CAMERA_CONFIG } from '../shared/config';
import { clamp, lerp } from '../shared/utils';

export default class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = CAMERA_CONFIG.baseZoom;
    this.viewportWidth = 1;
    this.viewportHeight = 1;
  }

  setViewport(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.viewportWidth / 2) / this.zoom + this.x,
      y: (screenY - this.viewportHeight / 2) / this.zoom + this.y,
    };
  }

  getViewBounds(padding = 0) {
    const halfWidth = this.viewportWidth / (2 * this.zoom);
    const halfHeight = this.viewportHeight / (2 * this.zoom);

    return {
      left: this.x - halfWidth - padding,
      right: this.x + halfWidth + padding,
      top: this.y - halfHeight - padding,
      bottom: this.y + halfHeight + padding,
    };
  }

  update(target, deltaTime, zoomMultiplier = 1) {
    const followAlpha = 1 - Math.exp(-CAMERA_CONFIG.followSharpness * deltaTime);
    this.x = lerp(this.x, target.x, followAlpha);
    this.y = lerp(this.y, target.y, followAlpha);

    const massScale = Math.pow(CAMERA_CONFIG.referenceMass / target.mass, CAMERA_CONFIG.zoomExponent);
    const desiredZoom = clamp(
      CAMERA_CONFIG.baseZoom * massScale * zoomMultiplier,
      CAMERA_CONFIG.minZoom,
      CAMERA_CONFIG.maxZoom,
    );
    const zoomAlpha = 1 - Math.exp(-CAMERA_CONFIG.zoomSharpness * deltaTime);
    this.zoom = lerp(this.zoom, desiredZoom, zoomAlpha);
  }
}
