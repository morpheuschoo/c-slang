import { MemoryAddressEntry } from "../processor/memoryAddressMap";
import { memoryManager } from "../processor/memoryManager";
import { Memory } from "./memory";

export class StackFrame {
  private functionName: string;
  private variablesMap: Map<string, MemoryAddressEntry> = new Map();

  constructor(functionName: string, basePointer: number, memory: Memory) {
    this.functionName = functionName;

    const addressMap = memoryManager.getAddressMap();
    const map = addressMap.getAddressMap();

    map.forEach((entry, name) => {
      const parts = name.split("::");
      const varName = parts[1];
      const scope = parts[0];

      if (scope === functionName) {
        const absoluteAddress = entry.offset + basePointer;
        const value = memory.load(
          {
            type: "MemoryAddress",
            value: BigInt(absoluteAddress),
            hexValue: absoluteAddress.toString(16),
          },
          "signed int"
        );
        if (value.type !== "IntegerConstant") {
          throw new Error("Stackframe: Not implemented yet");
        }

        this.variablesMap.set(varName, {
          ...entry,
          absoluteAddress,
          value: Number(value.value),
        });
      }
    });
  }
}
