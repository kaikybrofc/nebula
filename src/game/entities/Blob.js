import { COMBAT_CONFIG, PLAYER_CONFIG } from '../../shared/config.js';
import { createEntityId, massToRadius } from '../../shared/utils.js';
import { applyMovementForCell, getMaxSpeedForMass } from '../movement.js';

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
    return getMaxSpeedForMass(this.mass);
  }

  applySteering(inputDirection, deltaTime, sensitivity = 1) {
    applyMovementForCell(this, inputDirection, deltaTime, sensitivity);
  }
}
