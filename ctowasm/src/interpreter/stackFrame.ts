import { ScalarCDataType } from "../common/types";
import { MemoryAddressEntry } from "../processor/memoryAddressMap";
import { memoryManager } from "../processor/memoryManager";
import { Memory } from "./memory";

export class StackFrame {
  public functionName: string;
  public variablesMap: Map<string, MemoryAddressEntry> = new Map();
  public basePointer: number;
  public stackPointer: number;
  public sizeOfReturn: number;

  constructor(
    functionName: string, 
    basePointer: number,
    stackPointer: number,
    sizeOfReturn: number,
    memory: Memory,
  ) {
    this.functionName = functionName;

    const addressMap = memoryManager.getAddressMap();
    this.basePointer = basePointer;
    this.stackPointer = stackPointer;
    this.sizeOfReturn = sizeOfReturn;
    console.log("STACK FRAME CREATED", functionName, basePointer, sizeOfReturn, stackPointer)

    const map = addressMap.getAddressMap();

    map.forEach((entry, name) => {
      const parts = name.split("::");
      const varName = parts[1];
      const scope = parts[0];

      let targetDataType : ScalarCDataType = "signed int";

      if (entry.dataType.type == "primary") {
        targetDataType = entry.dataType.primaryDataType
      } else if(entry.dataType.type == "pointer") {
        targetDataType = "signed int"
      } else {
        throw new Error("Cannot load: " + entry.dataType + " from memory");
      }

      if (scope === functionName) {
        const absoluteAddress = entry.offset + basePointer;
        const value = memory.load(
          {
            type: "MemoryAddress",
            value: BigInt(absoluteAddress),
            hexValue: absoluteAddress.toString(16),
          },
          targetDataType
        );
        let targetValue = 0;

        if (value.type == "FunctionTableIndex") {
          targetValue = Number(value.index.value)
        } else {
          targetValue = Number(value.value)
        }

        this.variablesMap.set(varName, {
          ...entry,
          absoluteAddress,
          value: Number(targetValue),
        });
      }

    });
  }
}
