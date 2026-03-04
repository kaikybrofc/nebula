export default class RemoteState {
  constructor() {
    this.tick = 0;
    this.selfId = null;
    this.blobs = [];
    this.foods = [];
    this.pellets = [];
    this.leaderboard = [];
  }

  applySnapshot(snapshot) {
    this.tick = snapshot.tick;
    this.selfId = snapshot.selfId;
    this.blobs = snapshot.entities.blobs;
    this.foods = snapshot.entities.foods;
    this.pellets = snapshot.entities.pellets;
    this.leaderboard = snapshot.leaderboard;
  }

  getLocalBlobs() {
    if (!this.selfId) {
      return [];
    }

    return this.blobs.filter((blob) => blob.ownerId === this.selfId);
  }

  getLocalAggregate() {
    const localBlobs = this.getLocalBlobs();

    if (localBlobs.length === 0) {
      return null;
    }

    let totalMass = 0;
    let sumX = 0;
    let sumY = 0;
    let largestRadius = 0;

    for (let index = 0; index < localBlobs.length; index += 1) {
      const blob = localBlobs[index];
      totalMass += blob.mass;
      sumX += blob.x * blob.mass;
      sumY += blob.y * blob.mass;
      largestRadius = Math.max(largestRadius, blob.r);
    }

    return {
      x: sumX / totalMass,
      y: sumY / totalMass,
      mass: totalMass,
      largestRadius,
      cellCount: localBlobs.length,
    };
  }
}
