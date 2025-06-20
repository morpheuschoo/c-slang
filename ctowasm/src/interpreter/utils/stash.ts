import { ImmutableStack, Stack } from "./stack";

// TO FIX: define the types
export type StashItem = any;

export class Stash implements ImmutableStack<StashItem, Stash> {
  private readonly stack: Stack<StashItem>;

  constructor(items: ReadonlyArray<StashItem> = []) {
    this.stack = new Stack<StashItem>(items);
  }

  push(item: StashItem): Stash {
    const newStack = this.stack.push(item);
    return new Stash(newStack.toArray());
  }

  pop(): [StashItem | undefined, Stash] {
    const [item, newStack] = this.stack.pop();
    return [item, new Stash(newStack.toArray())];
  }

  peek(): StashItem | undefined {
    return this.stack.peek();
  }

  size(): number {
    return this.stack.size();
  }

  isEmpty(): boolean {
    return this.stack.isEmpty();
  }

  toArray(): ReadonlyArray<StashItem> {
    return this.stack.toArray();
  }

  toString(): string {
    if (this.isEmpty()) {
      return "  <empty>";
    }
    
    const stashItems = this.toArray();
    let result = "";

    for (let i = stashItems.length - 1; i >= 0; i--) {
      const item = stashItems[i];
      const itemPosition = stashItems.length - i;
      result += `  ${itemPosition}. ${this.formatStashItem(item)}\n`;
    }
    
    return result.trimEnd();
  }

  private formatStashItem(item: StashItem): string {
    if (item === null) return "null";
    if (item === undefined) return "undefined";
    
    if (typeof item === "number" || typeof item === "boolean") {
      return item.toString();
    }
    
    if (typeof item === "string") {
      return `"${item}"`;
    }
    
    if (Array.isArray(item)) {
      return `Array(${item.length})`;
    }
    
    if (typeof item === "object") {
      if (item.hasOwnProperty("type") && typeof item.type === "string") {
        return `Object(${item.type})`;
      }
      return `Object: ${JSON.stringify(item).substring(0, 50)}${JSON.stringify(item).length > 50 ? '...' : ''}`;
    }
    
    return String(item);
  }
}