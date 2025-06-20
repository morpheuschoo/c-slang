/**
 * Stack is implemented for control and stash registers.
 * Adapted from https://github.com/source-academy/js-slang/blob/master/src/cse-machine/stack.ts
 * and made to be immutable
 */
export interface ImmutableStack<T, S extends ImmutableStack<T, S> = ImmutableStack<T, any>> {
  push(item: T): S;
  pop(): [T | undefined, S];
  peek(): T | undefined;
  size(): number;
  isEmpty(): boolean;
  toArray(): ReadonlyArray<T>;
}

export class Stack<T> implements ImmutableStack<T, Stack<T>> {
  private readonly items: ReadonlyArray<T>;

  constructor(items: ReadonlyArray<T> = []) {
    this.items = items;
  }

  push(item: T): Stack<T> {
    return new Stack<T>([...this.items, item]);
  }

  pop(): [T | undefined, Stack<T>] {
    if (this.isEmpty()) {
      return [undefined, this];
    }
    const lastItem = this.items[this.items.length - 1];
    return [lastItem, new Stack<T>(this.items.slice(0, -1))];
  }

  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[this.items.length - 1];
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