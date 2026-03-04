import { MOVE_CONFIG } from '../shared/config.js';
import { clamp, lerp } from '../shared/utils.js';

function computeFollowAlpha(followValue, deltaTime) {
  const follow = clamp(followValue, 0, 1);
  return 1 - Math.pow(1 - follow, deltaTime * 60);
}

function toVisualBlob(blob) {
  return {
    id: blob.id,
    ownerId: blob.ownerId,
    x: blob.x,
    y: blob.y,
    r: blob.r,
    mass: blob.mass,
    nickname: blob.nickname,
    color: blob.color,
    stroke: blob.stroke,
  };
}

export default class VisualState {
  constructor() {
    this.visualBlobs = new Map();
  }

  reset() {
    this.visualBlobs.clear();
  }

  buildFrame(simFrame, deltaTime, selfId) {
    if (!simFrame) {
      return {
        tick: 0,
        blobs: [],
        foods: [],
        pellets: [],
      };
    }

    const seenBlobIds = new Set();
    const localFollow = MOVE_CONFIG.visualFollowLocal ?? MOVE_CONFIG.visualFollow ?? 0.3;
    const remoteFollow = MOVE_CONFIG.visualFollowRemote ?? 1;
    const localAlpha = computeFollowAlpha(localFollow, deltaTime);
    const remoteAlpha = computeFollowAlpha(remoteFollow, deltaTime);
    const nextBlobs = [];

    for (let index = 0; index < simFrame.blobs.length; index += 1) {
      const blob = simFrame.blobs[index];
      const previousVisual = this.visualBlobs.get(blob.id);
      const isLocal = Boolean(selfId) && blob.ownerId === selfId;
      const alpha = isLocal ? localAlpha : remoteAlpha;
      let visualX = blob.x;
      let visualY = blob.y;
      let visualR = blob.r;
      let visualMass = blob.mass;

      if (previousVisual) {
        visualX = lerp(previousVisual.x, blob.x, alpha);
        visualY = lerp(previousVisual.y, blob.y, alpha);
        visualR = lerp(previousVisual.r, blob.r, alpha);
        visualMass =
          typeof blob.mass === 'number' && typeof previousVisual.mass === 'number'
            ? lerp(previousVisual.mass, blob.mass, alpha)
            : blob.mass;
      }

      this.visualBlobs.set(blob.id, {
        x: visualX,
        y: visualY,
        r: visualR,
        mass: visualMass,
        ownerId: blob.ownerId,
      });

      seenBlobIds.add(blob.id);
      nextBlobs.push({
        ...toVisualBlob(blob),
        x: visualX,
        y: visualY,
        r: visualR,
        mass: visualMass,
      });
    }

    for (const id of this.visualBlobs.keys()) {
      if (!seenBlobIds.has(id)) {
        this.visualBlobs.delete(id);
      }
    }

    return {
      tick: simFrame.tick,
      blobs: nextBlobs,
      foods: simFrame.foods,
      pellets: simFrame.pellets,
    };
  }
}
