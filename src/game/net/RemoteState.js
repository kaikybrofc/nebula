import { NET_CONFIG } from '../../shared/config';
import { lerp } from '../../shared/utils';

const CLOCK_SYNC_ALPHA = 0.1;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function parseAckSeq(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseServerTimeMs(value, tick) {
  const parsed = Number(value);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return tick * (1000 / NET_CONFIG.tps);
}

function cloneEntity(entity) {
  return { ...entity };
}

function arrayToMap(entities = []) {
  const map = new Map();

  for (let index = 0; index < entities.length; index += 1) {
    const entity = entities[index];
    map.set(entity.id, cloneEntity(entity));
  }

  return map;
}

function mapToArray(entityMap) {
  return [...entityMap.values()].map((entity) => cloneEntity(entity));
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

function normalizeSnapshot(rawSnapshot) {
  return {
    tick: rawSnapshot.tick,
    serverTimeMs: parseServerTimeMs(rawSnapshot.serverTimeMs, rawSnapshot.tick),
    selfId: rawSnapshot.selfId ?? null,
    ackSeq: parseAckSeq(rawSnapshot.ackSeq, -1),
    entities: {
      blobs: rawSnapshot.entities?.blobs ?? [],
      foods: rawSnapshot.entities?.foods ?? [],
      pellets: rawSnapshot.entities?.pellets ?? [],
    },
    leaderboard: rawSnapshot.leaderboard ?? [],
  };
}

export default class RemoteState {
  constructor() {
    this.selfId = null;
    this.latestTick = 0;
    this.latestServerTimeMs = 0;
    this.latestLeaderboard = [];
    this.latestAckSeq = -1;
    this.latestEntities = {
      blobs: [],
      foods: [],
      pellets: [],
    };

    // Current authoritative client-side state reconstructed from full/delta messages.
    this.currentState = {
      blobs: new Map(),
      foods: new Map(),
      pellets: new Map(),
    };

    // Interpolation buffer still keeps complete snapshots.
    this.snapshotBuffer = [];

    // Approximation of (clientNowMs - serverTimeMs) for converting local clock to server clock.
    this.clockOffsetMs = null;
  }

  applySnapshot(snapshot) {
    if (!snapshot || typeof snapshot.tick !== 'number') {
      return;
    }

    if (snapshot.type === 'snapshot' || snapshot.type === 'snapshot_full') {
      this.applyFullSnapshot(snapshot);
      return;
    }

    if (snapshot.type === 'snapshot_delta') {
      this.applyDeltaSnapshot(snapshot);
    }
  }

  applyFullSnapshot(snapshot) {
    const normalized = normalizeSnapshot(snapshot);
    this.updateClockOffset(normalized.serverTimeMs);

    this.selfId = normalized.selfId;
    this.currentState = {
      blobs: arrayToMap(normalized.entities.blobs),
      foods: arrayToMap(normalized.entities.foods),
      pellets: arrayToMap(normalized.entities.pellets),
    };

    // Full snapshot resets interpolation history to avoid blending with stale worlds.
    this.snapshotBuffer = [];
    this.pushReconstructedSnapshot(
      normalized.tick,
      normalized.serverTimeMs,
      normalized.leaderboard,
      normalized.selfId,
      normalized.ackSeq,
    );
  }

  applyDeltaSnapshot(snapshot) {
    if (snapshot.selfId) {
      this.selfId = snapshot.selfId;
    }

    this.applyDeltaForType(this.currentState.blobs, snapshot.create?.blobs, snapshot.update?.blobs, snapshot.delete?.blobs);
    this.applyDeltaForType(this.currentState.foods, snapshot.create?.foods, snapshot.update?.foods, snapshot.delete?.foods);
    this.applyDeltaForType(
      this.currentState.pellets,
      snapshot.create?.pellets,
      snapshot.update?.pellets,
      snapshot.delete?.pellets,
    );

    const serverTimeMs = parseServerTimeMs(snapshot.serverTimeMs, snapshot.tick);
    this.updateClockOffset(serverTimeMs);

    this.pushReconstructedSnapshot(
      snapshot.tick,
      serverTimeMs,
      snapshot.leaderboard ?? [],
      this.selfId,
      parseAckSeq(snapshot.ackSeq, this.latestAckSeq),
    );
  }

  applyDeltaForType(map, createList = [], updateList = [], deleteList = []) {
    for (let index = 0; index < createList.length; index += 1) {
      const entity = createList[index];
      map.set(entity.id, cloneEntity(entity));
    }

    for (let index = 0; index < updateList.length; index += 1) {
      const patch = updateList[index];
      const previous = map.get(patch.id);

      if (!previous) {
        continue;
      }

      map.set(patch.id, {
        ...previous,
        ...patch,
      });
    }

    for (let index = 0; index < deleteList.length; index += 1) {
      map.delete(deleteList[index]);
    }
  }

  pushReconstructedSnapshot(tick, serverTimeMs, leaderboard, selfId, ackSeq) {
    const normalizedSnapshot = {
      tick,
      serverTimeMs,
      selfId: selfId ?? this.selfId,
      ackSeq,
      entities: {
        blobs: mapToArray(this.currentState.blobs),
        foods: mapToArray(this.currentState.foods),
        pellets: mapToArray(this.currentState.pellets),
      },
      leaderboard,
    };

    const snapshotIndex = this.snapshotBuffer.findIndex(
      (bufferedSnapshot) => bufferedSnapshot.tick === normalizedSnapshot.tick,
    );

    if (snapshotIndex >= 0) {
      this.snapshotBuffer[snapshotIndex] = normalizedSnapshot;
    } else {
      this.snapshotBuffer.push(normalizedSnapshot);
      this.snapshotBuffer.sort((left, right) => {
        if (left.serverTimeMs !== right.serverTimeMs) {
          return left.serverTimeMs - right.serverTimeMs;
        }

        return left.tick - right.tick;
      });
    }

    if (this.snapshotBuffer.length > NET_CONFIG.maxBufferedSnapshots) {
      this.snapshotBuffer.splice(0, this.snapshotBuffer.length - NET_CONFIG.maxBufferedSnapshots);
    }

    const latestSnapshot = this.snapshotBuffer[this.snapshotBuffer.length - 1];

    this.latestTick = latestSnapshot.tick;
    this.latestServerTimeMs = latestSnapshot.serverTimeMs;
    this.latestEntities = latestSnapshot.entities;
    this.latestLeaderboard = latestSnapshot.leaderboard;
    this.latestAckSeq = latestSnapshot.ackSeq ?? this.latestAckSeq;
    this.selfId = latestSnapshot.selfId ?? this.selfId;
  }

  getClientNowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }

    return Date.now();
  }

  updateClockOffset(serverTimeMs) {
    const clientNowMs = this.getClientNowMs();
    const measuredOffsetMs = clientNowMs - serverTimeMs;

    if (!Number.isFinite(measuredOffsetMs)) {
      return;
    }

    if (this.clockOffsetMs === null) {
      this.clockOffsetMs = measuredOffsetMs;
      return;
    }

    this.clockOffsetMs = lerp(this.clockOffsetMs, measuredOffsetMs, CLOCK_SYNC_ALPHA);
  }

  getEstimatedServerNowMs() {
    if (this.snapshotBuffer.length === 0) {
      return 0;
    }

    if (this.clockOffsetMs === null) {
      return this.latestServerTimeMs;
    }

    return this.getClientNowMs() - this.clockOffsetMs;
  }

  getRenderServerTimeMs() {
    if (this.snapshotBuffer.length === 0) {
      return 0;
    }

    return this.getEstimatedServerNowMs() - NET_CONFIG.interpDelayMs;
  }

  findFrameSnapshots(renderServerTimeMs) {
    if (this.snapshotBuffer.length === 0) {
      return null;
    }

    const firstSnapshot = this.snapshotBuffer[0];
    const lastSnapshot = this.snapshotBuffer[this.snapshotBuffer.length - 1];

    if (renderServerTimeMs <= firstSnapshot.serverTimeMs) {
      return {
        prev: firstSnapshot,
        next: firstSnapshot,
      };
    }

    if (renderServerTimeMs >= lastSnapshot.serverTimeMs) {
      return {
        prev: lastSnapshot,
        next: lastSnapshot,
      };
    }

    let prevSnapshot = firstSnapshot;
    let nextSnapshot = lastSnapshot;

    for (let index = 1; index < this.snapshotBuffer.length; index += 1) {
      const candidate = this.snapshotBuffer[index];

      if (candidate.serverTimeMs < renderServerTimeMs) {
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
    const renderServerTimeMs = this.getRenderServerTimeMs();
    const snapshotPair = this.findFrameSnapshots(renderServerTimeMs);

    if (!snapshotPair) {
      return {
        tick: 0,
        blobs: [],
        foods: [],
        pellets: [],
      };
    }

    const { prev, next } = snapshotPair;
    const serverTimeDelta = Math.max(1, next.serverTimeMs - prev.serverTimeMs);
    const alpha = clamp01((renderServerTimeMs - prev.serverTimeMs) / serverTimeDelta);

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

  getSelfId() {
    return this.selfId;
  }

  getLatestAckSeq() {
    return this.latestAckSeq;
  }

  getLatestLocalBlobs() {
    if (!this.selfId) {
      return [];
    }

    return this.latestEntities.blobs.filter((blob) => blob.ownerId === this.selfId);
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
