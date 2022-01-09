export default class Percentage {
  static min = new Percentage(0);
  static max = new Percentage(1);

  constructor(readonly zeroToOneValue: number) {}

  get zeroToOneHundredValue(): number {
    return 100 * this.zeroToOneValue;
  }

  toString(): string {
    return `${Math.round(this.zeroToOneHundredValue)}%`;
  }
}
