import { ScalarCDataType } from "../common/types";
import { MemoryAddressEntry } from "../processor/memoryAddressMap";
import { MemoryManager } from "../processor/memoryManager";
import { Memory } from "./memory";
import { ArrayDataType, DataType } from "../parser/c-ast/dataTypes";
import { getDataTypeSize } from "../processor/dataTypeUtil";

export class StackFrame {
  public functionName: string;
  public variablesMap: Map<string, MemoryAddressEntry> = new Map();
  public basePointer: number;
  public stackPointer: number;
  public sizeOfReturn: number;
  private memory: Memory;

  constructor(
    functionName: string,
    basePointer: number,
    stackPointer: number,
    sizeOfReturn: number,
    memory: Memory,
    memoryManager: MemoryManager
  ) {
    this.functionName = functionName;
    this.basePointer = basePointer;
    this.stackPointer = stackPointer;
    this.sizeOfReturn = sizeOfReturn;
    this.memory = memory;
    
    const addressMap = memoryManager.getAddressMap();
    const map = addressMap.getAddressMap();
    
    map.forEach((entry, name) => {
      const parts = name.split("::");
      if (parts.length < 2) {
        return;
      }
      
      const scope = parts[0];
      const varName = parts[1];
      
      const shouldInclude =
      (functionName === "global" && entry.isGlobal) ||
        (functionName === scope && !entry.isGlobal);

        if (!shouldInclude) {
          return;
        }
        
        const absoluteAddress = entry.isGlobal
        ? entry.offset
        : entry.offset + basePointer;
        
      if (entry.isArray) {
        this.variablesMap.set(varName, {
          ...entry,
          absoluteAddress,
          value: absoluteAddress,
        });
      } else {
        let targetDataType: ScalarCDataType = "signed int";
        
        if (entry.dataType.type === "primary") {
          targetDataType = entry.dataType.primaryDataType;
        } else if (entry.dataType.type === "pointer") {
          targetDataType = "signed int";
        }
        
        const value = memory.load(
          {
            type: "MemoryAddress",
            value: BigInt(absoluteAddress),
            hexValue: absoluteAddress.toString(16),
          },
          targetDataType
        );
        
        let targetValue = 0;
        if (value.type === "FunctionTableIndex") {
          targetValue = Number(value.index.value);
        } else {
          targetValue = Number(value.value);
        }
        
        this.variablesMap.set(varName, {
          ...entry,
          absoluteAddress,
          value: targetValue,
        });
      }
    });
  }

  public getTypeSize(dataType: DataType) {
    return getDataTypeSize(dataType);
  }

  public readPrimitiveValue(address: bigint, dataType: ScalarCDataType): string {
    const value = this.memory.load(
      {
      type: "MemoryAddress",
      value: address,
      hexValue: address.toString(16),
      },
      dataType
    );

    if (value.type === "FunctionTableIndex") {
      return String(value.index.value);
    }

    return String(value.value);
  }
  
  /**
   * Get array elements from memory
   * @param varName - The name of the array variable
   * @returns Array of values or null if variable is not an array
  */
  public getArrayElements(varName: string): number[] | null {
    const entry = this.variablesMap.get(varName);

    if (!entry || !entry.isArray) {
      return null;
    }

    if (!entry.arraySize || !entry.absoluteAddress) {
      return null;
    }

    let elementDataType: ScalarCDataType = "signed int";
    if (entry.dataType.type === "array") {
      const arrayType = entry.dataType as ArrayDataType;
      if (arrayType.elementDataType.type === "primary") {
        elementDataType = arrayType.elementDataType.primaryDataType;
      }
    }

    const elements: number[] = [];
    const baseAddress = entry.absoluteAddress;
    const elementSize = entry.elementSize || 4;

    for (let i = 0; i < entry.arraySize; i++) {
      const elementAddress = baseAddress + (i * elementSize);

      const value = this.memory.load(
        {
          type: "MemoryAddress",
          value: BigInt(elementAddress),
          hexValue: elementAddress.toString(16),
        },
        elementDataType
      );

      let elementValue = 0;
      if (value.type === "FunctionTableIndex") {
        elementValue = Number(value.index.value);
      } else {
        elementValue = Number(value.value);
      }

      elements.push(elementValue);
    }

    return elements;
  }

  /**
   * Get all arrays in the stack frame with their elements
   * @returns Map of array name to array elements
   */
  public getAllArrays(): Map<string, number[]> {
    const arrays = new Map<string, number[]>();

    this.variablesMap.forEach((entry, varName) => {
      if (entry.isArray) {
        const elements = this.getArrayElements(varName);
        if (elements !== null) {
          arrays.set(varName, elements);
        }
      }
    });

    return arrays;
  }

  /**
   * Print all variables and their values (including arrays)
   */
  public debugPrintVariables(): void {
    console.log(`\n=== Stack Frame Variables (${this.functionName}) ===`);

    this.variablesMap.forEach((entry, varName) => {
      if (entry.isArray) {
        const elements = this.getArrayElements(varName);
        console.log(`${varName}: array[${entry.arraySize}] = [${elements?.join(", ")}]`);
      } else {
        console.log(`${varName}: ${entry.dataType.type} = ${entry.value}`);
      }
    });

    console.log("===================================\n");
  }
}
