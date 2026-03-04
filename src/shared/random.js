export default class SeededRandom {
  constructor(seed = 1) {
    this.seed = seed >>> 0;
  }

  next() {
    this.seed += 0x6d2b79f5;
    let value = this.seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return this.next() * (max - min) + min;
  }

  int(maxExclusive) {
    return Math.floor(this.next() * maxExclusive);
  }
}
