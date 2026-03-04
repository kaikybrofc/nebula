import { COMBAT_CONFIG, PLAYER_CONFIG } from '../../shared/config';
import {
  clamp,
  createEntityId,
  limitVector,
  massToRadius,
  normalize,
} from '../../shared/utils';

export default class Blob {
  constructor({
    x,
    y,
    mass,
    ownerId,
    color,
    strokeColor,
    nickname,
    vx = 0,
    vy = 0,
    spawnProtection = COMBAT_CONFIG.spawnProtectionSeconds,
  }) {
    this.id = createEntityId('blob');
    this.type = 'blob';
    this.ownerId = ownerId;
    this.nickname = nickname;
    this.color = color;
    this.strokeColor = strokeColor;

    this.pos = { x, y };
    this.vel = { x: vx, y: vy };

    this.mass = mass;
    this.radius = massToRadius(mass);

    this.mergeTimer = 0;
    this.splitCooldown = 0;
    this.spawnProtection = spawnProtection;
  }

  setMass(nextMass) {
    this.mass = Math.max(PLAYER_CONFIG.minCellMass, nextMass);
    this.radius = massToRadius(this.mass);
  }

  addMass(amount) {
    this.mass += amount;
    this.radius = massToRadius(this.mass);
  }

  getMaxSpeed() {
    const scale = Math.pow(PLAYER_CONFIG.referenceMass / this.mass, PLAYER_CONFIG.speedExponent);
    return clamp(PLAYER_CONFIG.baseSpeed * scale, PLAYER_CONFIG.minSpeed, PLAYER_CONFIG.maxSpeed);
  }

  applySteering(aim, distanceToMouse, deltaTime, sensitivity) {
    const acceleration = PLAYER_CONFIG.acceleration * sensitivity;
    const throttle = clamp(distanceToMouse / PLAYER_CONFIG.stopDistance, 0, 1);
    const moveDirection = normalize(aim.x, aim.y);

    this.vel.x += moveDirection.x * acceleration * throttle * deltaTime;
    this.vel.y += moveDirection.y * acceleration * throttle * deltaTime;

    limitVector(this.vel, this.getMaxSpeed());
  }
}
