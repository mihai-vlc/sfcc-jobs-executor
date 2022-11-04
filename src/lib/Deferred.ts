export default class Deferred<T> {
  public readonly promise: Promise<T>;
  private _resolve!: (value: T) => any;
  private _reject!: (reason?: any) => any;

  get resolve() {
    return this._resolve;
  }

  get reject() {
    return this._reject;
  }

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this._reject = reject;
      this._resolve = resolve;
    });
  }
}
