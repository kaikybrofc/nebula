import { PELLET_CONFIG } from '../../shared/config';
import { createEntityId, massToRadius } from '../../shared/utils';

export default class Pellet {
  constructor({ x, y, mass, ownerId, vx, vy }) {
    this.id = createEntityId('pellet');
    this.type = 'pellet';
    this.ownerId = ownerId;

    this.pos = { x, y };
    this.vel = { x: vx, y: vy };

    this.mass = mass;
    this.radius = massToRadius(mass) * 0.62;
    this.age = 0;

    this.color = PELLET_CONFIG.color;
    this.strokeColor = PELLET_CONFIG.strokeColor;
  }
}
