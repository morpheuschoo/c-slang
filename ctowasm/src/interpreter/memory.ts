import { KB, WASM_PAGE_IN_HEX } from "~src/common/constants";
import { calculateNumberOfPagesNeededForBytes, getSizeOfScalarDataType, isFloatType, isIntegerType, primaryDataTypeSizes } from "~src/common/utils";
import { WASM_ADDR_TYPE } from "~src/translator/memoryUtil";
import { SharedWasmGlobalVariables } from "~src/modules";
import { FloatDataType, IntegerDataType, ScalarCDataType } from "~src/common/types";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { convertConstantToByteStr } from "~src/processor/byteStrUtil";
import { Runtime } from "./runtime";
import { createMemoryAddress, MemoryAddress, resolveValueToConstantP, RuntimeMemoryPair } from "~src/interpreter/utils/addressUtils";
import { StashItem } from "~src/interpreter/utils/stash";

export interface MemoryWriteInterface {
  type: "MemoryWriteInterface",
  address: bigint,
  value: ConstantP,
  dataType: ScalarCDataType
}

export function parseByteStr(byteStr: string) : Uint8Array {
  const matches = byteStr.match(/\\([0-9a-fA-F]{2})/g)
  if(!matches) {
    return new Uint8Array;
  }
  const byteArray = new Uint8Array(matches.length);
  for(let i = 0; i < matches.length; ++i) {
    const byteValue = parseInt(matches[i].slice(1), 16);
    byteArray[i] = byteValue;
  }
  return byteArray;
}

export class Memory {
  memory: WebAssembly.Memory;
  
  dataSegmentSizeInBytes: number;
  dataSegmentByteStr: string;
  heapBuffer: number // Heap size limit in bytes
  stackBuffer: number // Stacks size limit in bytes
  
  sharedWasmGlobalVariables: SharedWasmGlobalVariables;
  
  // Constructor to initiate the first runtime object
  constructor(
    dataSegmentByteStr: string, // The string of bytes (each byte is in the form "\\XX" where X is a digit in base-16) to initialize the data segment with, determined by processing initializers for data segment variables.
    dataSegmentSizeInBytes: number,
    heapBuffer?: number,
    stackBuffer?: number
  ) {
    this.dataSegmentSizeInBytes = dataSegmentSizeInBytes;
    this.dataSegmentByteStr = dataSegmentByteStr
    this.heapBuffer = heapBuffer ?? 32 * KB;
    this.stackBuffer = stackBuffer ?? 32 * KB;

    const totalMemory = this.dataSegmentSizeInBytes + this.heapBuffer + this.stackBuffer;
    const initialPages = calculateNumberOfPagesNeededForBytes(totalMemory);

    this.memory = new WebAssembly.Memory({ initial: initialPages });

    // this.setPointers(WASM_PAGE_IN_HEX * initialPages, 0, dataSegmentSizeInBytes + 4);

    this.sharedWasmGlobalVariables = {
      
      /**
       * stackPointer set to the highest address
       * basePointer set to the highest address
       * heapPointer set to after data portion
       */
      stackPointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        WASM_PAGE_IN_HEX * initialPages,
      ),
      basePointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        WASM_PAGE_IN_HEX * initialPages,
      ),
      heapPointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        dataSegmentSizeInBytes + 4,
      )
    };

    // Initiate the data segment that stores global and static values
    const dataSegmentByteArray = parseByteStr(dataSegmentByteStr)
    const view = new Uint8Array(this.memory.buffer);
    for (let i = 0; i < dataSegmentByteArray.length; i++) {
      view[i] = dataSegmentByteArray[i];
    }
  }

  // sets the values for stack pointer, base pointer, heap pointer
  
  // Coppies the current memory buffer and pointers on to Global Modules memory
  writeToModuleMemory() {
    const memoryView = new Uint8Array(this.memory.buffer);
    const moduleView = new Uint8Array(Runtime.modules.memory.buffer);

    if(memoryView.length !== moduleView.length) {
      throw new Error(`Memory size mismatch: interpreter memory length (${memoryView.length}) does not match module memory length (${moduleView.length})`);
    }

    for(let i = 0;i < memoryView.byteLength;i++) {
      moduleView[i] = memoryView[i];
    }

    Runtime.modules.sharedWasmGlobalVariables.basePointer.value = this.sharedWasmGlobalVariables.basePointer.value;
    Runtime.modules.sharedWasmGlobalVariables.heapPointer.value = this.sharedWasmGlobalVariables.heapPointer.value;
    Runtime.modules.sharedWasmGlobalVariables.stackPointer.value = this.sharedWasmGlobalVariables.stackPointer.value;
  }

  // Create a new memory instance that has the same content as the modules memory
  cloneModuleMemory(): Memory {
    const resultMemory = this.clone();

    const moduleView = new Uint8Array(Runtime.modules.memory.buffer);
    const memoryView = new Uint8Array(resultMemory.memory.buffer);

    if(memoryView.byteLength !== moduleView.byteLength) {
      throw new Error(`Memory size mismatch: interpreter memory length (${memoryView.length}) does not match module memory length (${moduleView.length})`);
    }

    for(let i = 0;i < memoryView.byteLength;i++) {
      memoryView[i] = moduleView[i];
    }

    resultMemory.sharedWasmGlobalVariables.basePointer.value = Runtime.modules.sharedWasmGlobalVariables.basePointer.value;
    resultMemory.sharedWasmGlobalVariables.heapPointer.value = Runtime.modules.sharedWasmGlobalVariables.heapPointer.value;
    resultMemory.sharedWasmGlobalVariables.stackPointer.value = Runtime.modules.sharedWasmGlobalVariables.stackPointer.value;
  
    return resultMemory;
  }

  setPointers(stackPointer: number, basePointer: number, heapPointer: number) {
    if(heapPointer > stackPointer) {
      throw new Error("Segmentation fault: Heap pointer clashed with stack pointer");
    }
    
    this.sharedWasmGlobalVariables = {
      stackPointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        stackPointer,
      ),
      basePointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        basePointer,
      ),
      heapPointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        heapPointer,
      )
    };
  }

  stackFrameSetup(sizeOfParams: number, sizeOfLocals: number, sizeOfReturn: number, parameters: StashItem[]): Memory {
    const newMemory = this.clone();
    const totalSize = sizeOfParams + sizeOfLocals + sizeOfReturn;

    const SP = this.sharedWasmGlobalVariables.stackPointer.value - totalSize;
    const BP = this.sharedWasmGlobalVariables.stackPointer.value - sizeOfReturn;

    newMemory.setPointers(
      SP,
      BP,
      this.sharedWasmGlobalVariables.heapPointer.value
    )

    let offset = 0;
    const writeParameters: MemoryWriteInterface[] = parameters.map(writeObject => {
      if (writeObject.type !== "IntegerConstant" && 
          writeObject.type !== "FloatConstant" && 
          writeObject.type !== "MemoryAddress") {
        throw new Error(`Did not expect ${writeObject.type} in stackFrameSetup`);
      }

      const size = getSizeOfScalarDataType(writeObject.dataType)
      offset -= size;

      const writeAddress = BigInt(offset) + BigInt(newMemory.sharedWasmGlobalVariables.basePointer.value);

      // if MemoryAddress convert it to a ConstantP
      const writeValue = resolveValueToConstantP(writeObject);

      // ConstantP is stored as ConstantP
      return {
        type: "MemoryWriteInterface",
        address: writeAddress,
        dataType: writeObject.dataType,
        value: writeValue
      };

    });

    return newMemory.write(writeParameters);
  }

  stackFrameTearDown(stackPointer: number, basePointer: number): Memory {
    const newMemory = this.clone();
    newMemory.setPointers(
      stackPointer,
      basePointer,
      this.sharedWasmGlobalVariables.heapPointer.value
    )

    return newMemory;
  }

  checkOutOfBounds(address: bigint) {
    return address < 0 || address >= this.memory.buffer.byteLength; 
  }

  // function to write a data type with a value to the memory in the address
  write(values: MemoryWriteInterface[]) : Memory {
    const newMemory = this.clone();
    const newMemoryView = new Uint8Array(newMemory.memory.buffer);

    for(const value of values) {
      const bytestr = convertConstantToByteStr(value.value, value.dataType);
      const byteArray = parseByteStr(bytestr);
  
      if(this.checkOutOfBounds(value.address)) {
        console.log(value.address);
        console.log(byteArray.length);
        console.log(bytestr);
        console.log(value.dataType);
        throw new Error("Memory out of bounds");
      }
      for(let i = 0; i < Math.min(byteArray.length, this.memory.buffer.byteLength - Number(value.address)); i++) {
        newMemoryView[i + Number(value.address)] = byteArray[i];
      }
    }

    return newMemory;
  }

  load(address: MemoryAddress): StashItem {
    // handles pointers
    if(address.dataType === "pointer") {
      // Load pointer value as "unsigned int" as they occupy the same amount of space
      const size = primaryDataTypeSizes["unsigned int"];
      this.checkOutOfBounds(address.value);
      
      let view = new Uint8Array(this.memory.buffer);
      let value = 0n;
      
      for (let i = 0; i < Math.min(size, this.memory.buffer.byteLength - Number(address.value)); i++) {
        value |= BigInt(view[Number(address.value) + i]) << BigInt(8 * i);
      }
      
      // returns a MemoryAddress instead of a ConstantP
      return createMemoryAddress(value, address.dataType);
    }
    
    // handles the rest of the ScalarCDataTypes
    const size = primaryDataTypeSizes[address.dataType];
    this.checkOutOfBounds(address.value);
    
    let view = new Uint8Array(this.memory.buffer);
    if(isIntegerType(address.dataType)) {
      let value = 0n;
      for (let i = 0; i < Math.min(size, this.memory.buffer.byteLength - Number(address.value)); i++) {
        value |= BigInt(view[Number(address.value) + i]) << BigInt(8 * i);
      }
      
      const signBit = 1n << BigInt(size * 8 - 1);
      const fullMask = 1n << BigInt(size * 8);

      if(value & signBit) {
        value = value - fullMask
      } else {
        value = value;
      }

      return {
        type: "IntegerConstant",
        value: value,
        dataType: address.dataType as IntegerDataType
      }
    } else if(isFloatType(address.dataType)) {
      let view = new Uint8Array(this.memory.buffer);
      const raw = view.slice(Number(address), Number(address) + size)
      const floatValue = address.dataType === "float" 
        ? new Float32Array(raw.buffer, raw.byteOffset)[0] 
        : new Float64Array(raw.buffer, raw.byteOffset)[0];
      
      return {
        type: "FloatConstant",
        value: floatValue,
        dataType: address.dataType as FloatDataType
      }
    } else {
      throw new Error("Unknown load value type");
    }
  }

  clone() : Memory {
    const clone = new Memory(
      this.dataSegmentByteStr,
      this.dataSegmentSizeInBytes,
      this.heapBuffer,
      this.stackBuffer
    )

    const originalView = new Uint8Array(this.memory.buffer);
    const cloneView = new Uint8Array(clone.memory.buffer);
    cloneView.set(originalView);
    
    clone.setPointers(
      this.sharedWasmGlobalVariables.stackPointer.value,
      this.sharedWasmGlobalVariables.basePointer.value,
      this.sharedWasmGlobalVariables.heapPointer.value
    )

    return clone;
  }

  getFormattedMemoryView(start: number = 0, end?: number): string {
    const memoryView = new Uint8Array(this.memory.buffer);
    const length = end ?? memoryView.length;

    const BP = Number(this.sharedWasmGlobalVariables.basePointer.value);
    const SP = Number(this.sharedWasmGlobalVariables.stackPointer.value);
    const HP = Number(this.sharedWasmGlobalVariables.heapPointer.value);

    let result = "";
    // result += "=== Memory Layout (partial) ===\n";
    // result += `Base Pointer (BP):  0x${BP.toString(10)} (${BP})\n`;
    // result += `Stack Pointer (SP): 0x${SP.toString(10)} (${SP})\n`;
    // result += `Heap Pointer (HP):  0x${HP.toString(10)} (${HP})\n`;
    // result += "================================\n";

    // const bytesPerRow = 16;
    // for (let i = start; i < Math.min(length, memoryView.length); i += bytesPerRow) {
    //   const bytes = memoryView.slice(i, i + bytesPerRow);
    //   const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
    //   const ascii = Array.from(bytes).map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    //   result += `0x${i.toString(16).padStart(8, '0')}: ${hex.padEnd(3 * bytesPerRow)} | ${ascii}\n`;
    // }

    return result;
  }


}