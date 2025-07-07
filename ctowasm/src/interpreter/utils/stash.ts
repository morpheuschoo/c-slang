import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { Stack } from "./stack";
import { MemoryAddress } from '~src/interpreter/utils/addressUtils'

export type StashItem = ConstantP | MemoryAddress;

export class Stash extends Stack<StashItem, Stash> {
  protected createNew(items: ReadonlyArray<StashItem>): Stash {
    return new Stash(items);
  }

  static isConstant(item: StashItem): item is ConstantP {
    return item.type === "IntegerConstant" || item.type === "FloatConstant";
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
      let displayValue = "";
      
      switch (item.type) {
        case "IntegerConstant":
        case "FloatConstant":
          displayValue = `${item.value}`;
          break;
        case "MemoryAddress":
          displayValue = `MemoryAddress(address: ${item.hexValue}, type: ${item.dataType})`;
          break;
        default:
          break;
      }
      result += `  ${itemPosition}. ${displayValue}\n`;
    }
    return result.trimEnd();
  }
}