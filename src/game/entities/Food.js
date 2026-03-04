import { massToRadius } from '../../shared/utils';

export default class Food {
  constructor(x, y, mass, color) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.radius = massToRadius(mass) * 0.5;
    this.color = color;
  }
}
