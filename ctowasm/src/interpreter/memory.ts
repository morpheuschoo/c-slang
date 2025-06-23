// A runtime class for the interpreter which encapsulates the memory 
import { KB, WASM_PAGE_IN_HEX } from "~src/common/constants";
import { calculateNumberOfPagesNeededForBytes } from "~src/common/utils";
import { WASM_ADDR_TYPE } from "~src/translator/memoryUtil";
import { SharedWasmGlobalVariables } from "~src/modules";
import { Address } from "~src/processor/c-ast/memory";
import { ScalarCDataType } from "~src/common/types";
import { ConstantP } from "~src/processor/c-ast/expression/constants";

export function parseDataSegmentByteStr(dataSegmentByteStr: string) : Uint8Array {
  const matches = dataSegmentByteStr.match(/\\([0-9a-fA-F]{2})/g)
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

// state that the programm go through at run time
export class Memory {
  memory: WebAssembly.Memory;
  
  dataSegmentSizeInBytes: number;
  dataSegmentByteStr: string;
  heapBuffer: number // Heap size limit in bytes
  stackBuffer: number // Stacks size limit in bytes

  sharedWasmGlobalVariables: SharedWasmGlobalVariables;
  
  // sets the values for stack pointer, base pointer, heap pointer
  setPointers(stackPointer: number, basePointer: number, heapPointer: number) {
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

  write(address: Address, value: ConstantP, datatype: ScalarCDataType) : Memory {
    switch (address.type) {
      case "LocalAddress":
        
    }
  
    return this;
  }

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
      stackPointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        WASM_PAGE_IN_HEX * initialPages,
      ),
      basePointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        0,
      ),
      heapPointer: new WebAssembly.Global(
        { value: WASM_ADDR_TYPE, mutable: true },
        dataSegmentSizeInBytes + 4,
      )
    };

    // Initiate the data segment that stores global and static values
    const dataSegmentByteArray = parseDataSegmentByteStr(dataSegmentByteStr)
    const view = new Uint8Array(this.memory.buffer);
    for(let i = 0;i < dataSegmentByteArray.length;i++) {
      view[i] = dataSegmentByteArray[i];
    }

    // test
    const first8Bytes = view.slice(8);
    const dataView = new DataView(first8Bytes.buffer, first8Bytes.byteOffset, first8Bytes.byteLength);
    const longValue = dataView.getBigInt64(0, true); // little-endian
    console.log("First 8 bytes as long:", longValue.toString());
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
}