import { CAMERA_CONFIG } from '../shared/config';
import { clamp, lerp } from '../shared/utils';

function smoothingToAlpha(smoothing, deltaTime) {
  const clamped = clamp(smoothing, 0, 1);
  return 1 - Math.pow(1 - clamped, deltaTime * 60);
}

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
    const followAlpha =
      typeof CAMERA_CONFIG.followSmoothing === 'number'
        ? smoothingToAlpha(CAMERA_CONFIG.followSmoothing, deltaTime)
        : 1 - Math.exp(-CAMERA_CONFIG.followSharpness * deltaTime);
    this.x = lerp(this.x, target.x, followAlpha);
    this.y = lerp(this.y, target.y, followAlpha);

    const massScale = Math.pow(CAMERA_CONFIG.referenceMass / target.mass, CAMERA_CONFIG.zoomExponent);
    const desiredZoom = clamp(
      CAMERA_CONFIG.baseZoom * massScale * zoomMultiplier,
      CAMERA_CONFIG.minZoom,
      CAMERA_CONFIG.maxZoom,
    );
    const zoomAlpha =
      typeof CAMERA_CONFIG.zoomSmoothing === 'number'
        ? smoothingToAlpha(CAMERA_CONFIG.zoomSmoothing, deltaTime)
        : 1 - Math.exp(-CAMERA_CONFIG.zoomSharpness * deltaTime);
    this.zoom = lerp(this.zoom, desiredZoom, zoomAlpha);
  }
}
