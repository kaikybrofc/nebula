import { PLAYER_CONFIG } from '../../shared/config';
import { clamp, massToRadius } from '../../shared/utils';

export default class Player {
  constructor({ x, y, nickname }) {
    this.x = x;
    this.y = y;
    this.nickname = nickname;
    this.mass = PLAYER_CONFIG.initialMass;
    this.color = PLAYER_CONFIG.color;
    this.strokeColor = PLAYER_CONFIG.strokeColor;
  }

  get radius() {
    return massToRadius(this.mass);
  }

  get speed() {
    const scale = Math.pow(PLAYER_CONFIG.referenceMass / this.mass, PLAYER_CONFIG.speedExponent);
    const speed = PLAYER_CONFIG.baseSpeed * scale;

    return clamp(speed, PLAYER_CONFIG.minSpeed, PLAYER_CONFIG.maxSpeed);
  }

  addMass(amount) {
    this.mass += amount * PLAYER_CONFIG.massGainFactor;
  }

  update(target, deltaTime) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.5) {
      return;
    }

    const directionX = dx / distance;
    const directionY = dy / distance;
    const moveStep = Math.min(distance, this.speed * deltaTime);

    this.x += directionX * moveStep;
    this.y += directionY * moveStep;
  }
}
