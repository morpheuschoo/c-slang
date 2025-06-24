import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { Stack } from "./stack";
import { Address } from "~src/processor/c-ast/memory";

export type StashItem = ConstantP | Address;

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
      result += `  ${itemPosition}. ${item.value}\n`;
    }
    
    return result.trimEnd();
  }
}