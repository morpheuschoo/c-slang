/**
 * Stack is implemented for control and stash registers.
 * Adapted from https://github.com/source-academy/js-slang/blob/master/src/cse-machine/stack.ts
 * and made to be immutable
 */

export interface ImmutableStack<T, S> {
  push(item: T): S;
  pop(): [T | undefined, S];
  peek(): T | undefined;
  size(): number;
  isEmpty(): boolean;
  toArray(): ReadonlyArray<T>;
}

export class Stack<T, R = any> implements ImmutableStack<T, R> {
  protected readonly storage: ReadonlyArray<T>;

  constructor(items: ReadonlyArray<T> = []) {
    this.storage = items;
  }

  protected createNew(items: ReadonlyArray<T>): R {
    return new Stack<T>(items) as unknown as R;
  }

  setTo(otherStack: Stack<T, R>): void {}

  concat(item: T[]) {
    return this.createNew([...this.storage, ...item]);
  }

  push(item: T): R {
    return this.createNew([...this.storage, item]);
  }

  public getStack(): ReadonlyArray<T> {
    return [...this.storage];
  }

  public some(predicate: (value: T) => boolean): boolean {
    return this.storage.some(predicate);
  }

  pop(): [T | undefined, R] {
    if (this.isEmpty()) {
      return [undefined, this as unknown as R];
    }
    const lastItem = this.storage[this.storage.length - 1];
    return [lastItem, this.createNew(this.storage.slice(0, -1))];
  }

  getIdx(idx: number): T {
    if (idx < 0 || idx >= this.storage.length) {
      throw new Error("Stack out of bounds");
    }
    return this.storage[idx];
  }

  peek(): T {
    if (this.isEmpty()) {
      throw new Error("Cannot peek: stack is empty.");
    }
    return this.storage[this.storage.length - 1];
  }
  /**
   * Returns a subarray of the last `depth` elements from the stack.
   * If depth is greater than the stack size, returns the whole stack.
   */
  peekLast(depth: number): ReadonlyArray<T> {
    if (this.storage.length < depth) {
      throw new Error("PeekLast out of bounds");
    }

    return this.storage.slice(this.storage.length - depth);
  }

  size(): number {
    return this.storage.length;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  toArray(): ReadonlyArray<T> {
    return this.storage;
  }
}
