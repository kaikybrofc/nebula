import { PELLET_CONFIG } from '../../shared/config.js';
import { createEntityId, massToRadius } from '../../shared/utils.js';

export default class Pellet {
  constructor({ x, y, mass, ownerId, vx, vy, pickupDelay = PELLET_CONFIG.pickupDelay, maxLife = PELLET_CONFIG.maxLife }) {
    this.id = createEntityId('pellet');
    this.type = 'pellet';
    this.ownerId = ownerId;

    this.pos = { x, y };
    this.vel = { x: vx, y: vy };

    this.mass = mass;
    this.radius = massToRadius(mass) * 0.62;
    this.age = 0;
    this.pickupDelay = pickupDelay;
    this.maxLife = maxLife;

    this.color = PELLET_CONFIG.color;
    this.strokeColor = PELLET_CONFIG.strokeColor;
  }
}
