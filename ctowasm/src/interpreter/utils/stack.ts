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
  protected readonly items: ReadonlyArray<T>;

  constructor(items: ReadonlyArray<T> = []) {
    this.items = items;
  }

  protected createNew(items: ReadonlyArray<T>): R {
    return new Stack<T>(items) as unknown as R;
  }

  concat(item: T[]) {
    return this.createNew([...this.items, ...item]);
  }

  push(item: T): R {
    return this.createNew([...this.items, item]);
  }

  pop(): [T | undefined, R] {
    if (this.isEmpty()) {
      return [undefined, this as unknown as R];
    }
    const lastItem = this.items[this.items.length - 1];
    return [lastItem, this.createNew(this.items.slice(0, -1))];
  }

  getIdx(idx: number): T {
    if(idx < 0 || idx >= this.items.length) {
      throw new Error("Stack out of bounds");
    }
    return this.items[idx];
  }

  peek(): T {
    if (this.isEmpty()) {
      throw new Error("Cannot peek: stack is empty.")
    }
    return this.items[this.items.length - 1];
  }
  /**
   * Returns a subarray of the last `depth` elements from the stack.
   * If depth is greater than the stack size, returns the whole stack.
   */
  peekLast(depth: number): ReadonlyArray<T> {
    if(this.items.length < depth) {
      throw new Error("PeekLast out of bounds")
    }

    return this.items.slice(this.items.length - depth);
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  toArray(): ReadonlyArray<T> {
    return this.items;
  }
}