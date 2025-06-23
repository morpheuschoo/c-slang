import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { Stack } from "./stack";

// TO FIX: define the types
export type StashItem = ConstantP;

export class Stash extends Stack<StashItem, Stash> {
  protected createNew(items: ReadonlyArray<StashItem>): Stash {
    return new Stash(items);
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
    
    if (typeof item.value === "number" || typeof item.value === "boolean") {
      return item.value.toString();
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