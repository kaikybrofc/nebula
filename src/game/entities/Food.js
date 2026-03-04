import { createEntityId, massToRadius } from '../../shared/utils';

export default class Food {
  constructor(x, y, mass, color) {
    this.id = createEntityId('food');
    this.type = 'food';
    this.ownerId = null;
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.mass = mass;
    this.radius = massToRadius(mass) * 0.5;
    this.color = color;
  }
}
