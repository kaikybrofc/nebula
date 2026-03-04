import { NET_CONFIG } from '../../shared/config';
import { lerp } from '../../shared/utils';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function buildEntityMap(entities) {
  const map = new Map();

  for (let index = 0; index < entities.length; index += 1) {
    const entity = entities[index];
    map.set(entity.id, entity);
  }

  return map;
}

function interpolateEntity(prevEntity, nextEntity, alpha) {
  return {
    ...nextEntity,
    x: lerp(prevEntity.x, nextEntity.x, alpha),
    y: lerp(prevEntity.y, nextEntity.y, alpha),
    r: lerp(prevEntity.r, nextEntity.r, alpha),
    mass:
      typeof prevEntity.mass === 'number' && typeof nextEntity.mass === 'number'
        ? lerp(prevEntity.mass, nextEntity.mass, alpha)
        : nextEntity.mass,
  };
}

function interpolateEntityList(prevList, nextList, alpha) {
  const prevMap = buildEntityMap(prevList);
  const nextMap = buildEntityMap(nextList);
  const ids = new Set([...prevMap.keys(), ...nextMap.keys()]);
  const result = [];

  for (const id of ids) {
    const prevEntity = prevMap.get(id);
    const nextEntity = nextMap.get(id);

    if (prevEntity && nextEntity) {
      result.push(interpolateEntity(prevEntity, nextEntity, alpha));
      continue;
    }

    if (nextEntity) {
      result.push(nextEntity);
      continue;
    }

    if (prevEntity) {
      result.push(prevEntity);
    }
  }

  return result;
}

function aggregateLocalBlobs(blobs, selfId) {
  if (!selfId) {
    return null;
  }

  let totalMass = 0;
  let sumX = 0;
  let sumY = 0;
  let largestRadius = 0;
  let cellCount = 0;

  for (let index = 0; index < blobs.length; index += 1) {
    const blob = blobs[index];

    if (blob.ownerId !== selfId) {
      continue;
    }

    const mass = typeof blob.mass === 'number' ? blob.mass : 0;

    totalMass += mass;
    sumX += blob.x * mass;
    sumY += blob.y * mass;
    largestRadius = Math.max(largestRadius, blob.r);
    cellCount += 1;
  }

  if (cellCount === 0 || totalMass <= 0) {
    return null;
  }

  return {
    x: sumX / totalMass,
    y: sumY / totalMass,
    mass: totalMass,
    largestRadius,
    cellCount,
  };
}

export default class RemoteState {
  constructor() {
    this.selfId = null;
    this.latestTick = 0;
    this.latestLeaderboard = [];
    this.latestEntities = {
      blobs: [],
      foods: [],
      pellets: [],
    };
    this.snapshotBuffer = [];
  }

  applySnapshot(snapshot) {
    if (!snapshot || snapshot.type !== 'snapshot' || typeof snapshot.tick !== 'number') {
      return;
    }

    const normalizedSnapshot = {
      tick: snapshot.tick,
      selfId: snapshot.selfId,
      entities: {
        blobs: snapshot.entities?.blobs ?? [],
        foods: snapshot.entities?.foods ?? [],
        pellets: snapshot.entities?.pellets ?? [],
      },
      leaderboard: snapshot.leaderboard ?? [],
    };

    this.selfId = normalizedSnapshot.selfId;

    const snapshotIndex = this.snapshotBuffer.findIndex(
      (bufferedSnapshot) => bufferedSnapshot.tick === normalizedSnapshot.tick,
    );

    if (snapshotIndex >= 0) {
      this.snapshotBuffer[snapshotIndex] = normalizedSnapshot;
    } else {
      this.snapshotBuffer.push(normalizedSnapshot);
      this.snapshotBuffer.sort((left, right) => left.tick - right.tick);
    }

    if (this.snapshotBuffer.length > NET_CONFIG.maxBufferedSnapshots) {
      this.snapshotBuffer.splice(
        0,
        this.snapshotBuffer.length - NET_CONFIG.maxBufferedSnapshots,
      );
    }

    const latestSnapshot = this.snapshotBuffer[this.snapshotBuffer.length - 1];

    this.latestTick = latestSnapshot.tick;
    this.latestEntities = latestSnapshot.entities;
    this.latestLeaderboard = latestSnapshot.leaderboard;
  }

  getRenderTick() {
    if (this.snapshotBuffer.length === 0) {
      return 0;
    }

    return this.latestTick - NET_CONFIG.interpDelayTicks;
  }

  findFrameSnapshots(renderTick) {
    if (this.snapshotBuffer.length === 0) {
      return null;
    }

    const firstSnapshot = this.snapshotBuffer[0];
    const lastSnapshot = this.snapshotBuffer[this.snapshotBuffer.length - 1];

    if (renderTick <= firstSnapshot.tick) {
      return {
        prev: firstSnapshot,
        next: firstSnapshot,
      };
    }

    if (renderTick >= lastSnapshot.tick) {
      return {
        prev: lastSnapshot,
        next: lastSnapshot,
      };
    }

    let prevSnapshot = firstSnapshot;
    let nextSnapshot = lastSnapshot;

    for (let index = 1; index < this.snapshotBuffer.length; index += 1) {
      const candidate = this.snapshotBuffer[index];

      if (candidate.tick < renderTick) {
        prevSnapshot = candidate;
        continue;
      }

      nextSnapshot = candidate;
      break;
    }

    return {
      prev: prevSnapshot,
      next: nextSnapshot,
    };
  }

  getInterpolatedFrame() {
    const renderTick = this.getRenderTick();
    const snapshotPair = this.findFrameSnapshots(renderTick);

    if (!snapshotPair) {
      return {
        tick: 0,
        blobs: [],
        foods: [],
        pellets: [],
      };
    }

    const { prev, next } = snapshotPair;
    const tickDelta = Math.max(1, next.tick - prev.tick);
    const alpha = clamp01((renderTick - prev.tick) / tickDelta);

    return {
      tick: lerp(prev.tick, next.tick, alpha),
      blobs: interpolateEntityList(prev.entities.blobs, next.entities.blobs, alpha),
      foods: interpolateEntityList(prev.entities.foods, next.entities.foods, alpha),
      pellets: interpolateEntityList(prev.entities.pellets, next.entities.pellets, alpha),
    };
  }

  getLatestLocalAggregate() {
    return aggregateLocalBlobs(this.latestEntities.blobs, this.selfId);
  }

  getLocalAggregateFromFrame(frame) {
    return aggregateLocalBlobs(frame.blobs, this.selfId);
  }

  getLatestLeaderboard() {
    return this.latestLeaderboard;
  }

  getLatestCounts() {
    return {
      foods: this.latestEntities.foods.length,
      pellets: this.latestEntities.pellets.length,
    };
  }

  getPlayerRank() {
    if (!this.selfId || this.latestLeaderboard.length === 0) {
      return 1;
    }

    const rank = this.latestLeaderboard.findIndex((entry) => entry.id === this.selfId);
    return rank >= 0 ? rank + 1 : 1;
  }
}
