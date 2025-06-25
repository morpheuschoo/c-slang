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
      let displayValue = "";
      
      switch (item.type) {
        case "IntegerConstant":
        case "FloatConstant":
          displayValue = `${item.value}`;
          break;
        case "LocalAddress":
          displayValue = `LocalAddress(offset: ${item.offset.value})`;
          break;
        case "DataSegmentAddress":
          displayValue = `DataSegmentAddress(offset: ${item.offset.value})`;
          break;
        case "DynamicAddress":
          displayValue = `DynamicAddress(${item.address.type})`;
          break;
        case "FunctionTableIndex":
          displayValue = `FunctionTableIndex(${item.index.value})`;
          break;
        case "ReturnObjectAddress":
          displayValue = `ReturnObjectAddress(${item.subtype}, offset: ${item.offset.value})`;
          break;
        default:
          break;
      }
      result += `  ${itemPosition}. ${displayValue}\n`;
    }
    return result.trimEnd();
  }
}