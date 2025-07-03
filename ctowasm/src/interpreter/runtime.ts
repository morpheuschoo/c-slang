import { ControlItem, Control } from "~src/interpreter/utils/control";
import { StashItem, Stash} from "~src/interpreter/utils/stash";
import { CAstRootP, CNodeP } from "~src/processor/c-ast/core";
import { Instruction, isInstruction } from "~src/interpreter/controlItems/instructions";
import { NodeEvaluator } from "~src/interpreter/evaluators/nodeEvaluator";
import { InstructionEvaluator } from "~src/interpreter/evaluators/instructionEvaluator";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { Memory, MemoryWriteInterface } from "./memory";
import { ScalarCDataType } from "~src/common/types";
import { Address, LocalAddress, MemoryLoad } from "~src/processor/c-ast/memory";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import ModuleRepository, { ModuleName, SharedWasmGlobalVariables } from "~src/modules";
import { getSizeOfScalarDataType } from "~src/common/utils";

export interface RuntimeMemoryWrite {
  type: "RuntimeMemoryWrite";
  address: Address | ConstantP;
  value: ConstantP;
  datatype: ScalarCDataType;
}

export class Runtime {
  private readonly control: Control;
  private readonly stash: Stash;
  private readonly memory: Memory;
  
  public static astRootP: CAstRootP;
  public static includedModules: ModuleName[];
  public static modules: ModuleRepository;

  constructor(
    control?: Control,
    stash?: Stash,
    memory?: Memory
  ) {
    this.stash = stash || new Stash();
    this.control = control || new Control();

    if(!memory) {
      if(!Runtime.astRootP) {
        throw new Error("AST Root node not assigned");
      }

      this.memory = new Memory(Runtime.astRootP.dataSegmentByteStr, Runtime.astRootP.dataSegmentSizeInBytes);
    } else {
      this.memory = memory;
    }
  }

  next(): Runtime {
    if (this.hasCompleted()) {
      return new Runtime(this.control, this.stash, this.memory);
    }

    const [item, newControl] = this.control.pop();
    const poppedRuntime = new Runtime(
      newControl,
      this.stash,
      this.memory,
    );

    if (isInstruction(item)) {
      return poppedRuntime.evaluateInstruction(item as Instruction);
    } else {
      return poppedRuntime.evaluateNode(item as CNodeP);
    }
  }
  
  private evaluateNode(node: CNodeP): Runtime {
    const evaluator = NodeEvaluator[node.type];
    if (evaluator) {
      const result = evaluator(this, node as any);
      return result;
    } else {
      throw new Error(`Unknown node type ${node.type}`);
    }
  }

  private evaluateInstruction(instruction: Instruction): Runtime {
    if (InstructionEvaluator[instruction.type]) {
      const result = InstructionEvaluator[instruction.type](this, instruction as any);
      return result;
    } else {
      throw new Error("Unknown instruction type");
    }
  }
  
  // TODO
  getFunction(name: string): FunctionDefinitionP | undefined {
    return Runtime.astRootP.functions.find(x => x.name === name);
  }

  // MEMORY
  writeToModulesMemory(): void {
    this.memory.writeToModuleMemory();
  }

  cloneModuleMemory(): Runtime {
    const newMemory = this.memory.cloneModuleMemory();

    return new Runtime(
      this.control,
      this.stash,
      newMemory,
    )
  }

  memoryWrite(writes: RuntimeMemoryWrite[]) : Runtime {
    const memoryWriteInterfaceArray : MemoryWriteInterface[] = writes.map(writeObject => {
      switch(writeObject.address.type) {
        case "LocalAddress": {
          const writeAddress = BigInt(this.memory.sharedWasmGlobalVariables.basePointer.value) + writeObject.address.offset.value;
          return {
            type: "MemoryWriteInterface",
            address: writeAddress,
            value: writeObject.value,
            dataType: writeObject.datatype
          };
        }
    
        case "DataSegmentAddress": {
          const writeAddress = writeObject.address.offset.value;
          return {
            type: "MemoryWriteInterface",
            address: writeAddress,
            value: writeObject.value,
            dataType: writeObject.datatype
          };
        }
        
        case "IntegerConstant": {
          const writeAddress = writeObject.address.value
          return {
            type: "MemoryWriteInterface",
            address: writeAddress,
            value: writeObject.value,
            dataType: writeObject.datatype
          };
        }
        
        case "ReturnObjectAddress": {
          if(writeObject.address.subtype === "load") {
            throw new Error("Return object load instruction found in memory write")
          }
          const writeAddress = BigInt(this.memory.sharedWasmGlobalVariables.basePointer.value) + writeObject.address.offset.value;
          
          return {
            type: "MemoryWriteInterface",
            address: writeAddress,
            value: writeObject.value,
            dataType: writeObject.datatype
          };
        }
    
        case "DynamicAddress": {
          throw new Error("Dynamic address should not be processed in memory write");
        }
    
        case "FunctionTableIndex": {
          // TODO: Figur out later
          throw new Error("Havent implemented")
        }
    
        case "FloatConstant": {
          throw new Error("Cannot access an address whose value is a float");
        }
      }
    })    

    return new Runtime(
      this.control,
      this.stash,
      this.memory.write(memoryWriteInterfaceArray)
    )
  }

  memoryLoad(address: Address | ConstantP, dataType: ScalarCDataType) {
    switch(address.type) {
      case "LocalAddress": {
        const writeAddress = BigInt(this.memory.sharedWasmGlobalVariables.basePointer.value) + address.offset.value;
        const value = this.memory.load(writeAddress, dataType);
        const [ _, newRuntime ] = this.popValue();

        return newRuntime.pushValue(value);
      }

      case "DataSegmentAddress": {
        const writeAddress = address.offset.value;
        const value = this.memory.load(writeAddress, dataType);
        const [ _, newRuntime ] = this.popValue();

        return newRuntime.pushValue(value);
      }
      
      case "IntegerConstant": {
        const writeAddress = address.value
        const value = this.memory.load(writeAddress, dataType);
        const [ _, newRuntime ] = this.popValue();

        return newRuntime.pushValue(value);
      }
      
      case "ReturnObjectAddress": {
        if(address.subtype === "store") {
          throw new Error("Return object store instruction found in memory load")
        }
        const writeAddress = BigInt(this.memory.sharedWasmGlobalVariables.stackPointer.value) + address.offset.value;

        const value = this.memory.load(writeAddress, dataType);
        const [ _, newRuntime ] = this.popValue();

        return newRuntime.pushValue(value);
      }

      case "DynamicAddress": {
        throw new Error("Dynamic address should not be processed in memory write");
      }

      case "FunctionTableIndex": {
        // TODO: Figur out later
        throw new Error("Havent implemented")
      }

      case "FloatConstant": {
        throw new Error("Cannot access an address whose value is a float");
      }

    }
  }

  stackFrameSetup(sizeOfParams: number, sizeOfLocals: number, sizeOfReturn: number, parameters: StashItem[]): Runtime {
    const newMemory = this.memory.stackFrameSetup(sizeOfParams, sizeOfLocals, sizeOfReturn);
    const newRuntime = new Runtime(
      this.control,
      this.stash,
      newMemory
    )

    let offset = 0;
    const writeParameters : RuntimeMemoryWrite[] = parameters.map(writeObject => {
      if(writeObject.type === "IntegerConstant" || writeObject.type === "FloatConstant") {
        const size = getSizeOfScalarDataType(writeObject.dataType)
        offset -= size;

        const writeAddress : LocalAddress = {
          type: "LocalAddress",
          offset: {
            type: "IntegerConstant",
            value: BigInt(offset),
            dataType: "unsigned int"
          },
          dataType: "pointer"
        }

        const res : RuntimeMemoryWrite = {
          type: "RuntimeMemoryWrite",
          address: writeAddress,
          value: writeObject,
          datatype: writeObject.dataType
        }

        return res;
      } else {
        throw new Error("Not implemented yet: pointers as function arguments");
      }
    })
    const writtenRuntime = newRuntime.memoryWrite(writeParameters);

    return writtenRuntime;
  }

  stackFrameTearDown(stackPointer: number, basePointer: number) {
    const newMemory = this.memory.stackFrameTearDown(stackPointer, basePointer);

    return new Runtime(
      this.control,
      this.stash,
      newMemory
    )
  }

  getPointers() : SharedWasmGlobalVariables {
    return this.memory.sharedWasmGlobalVariables;
  }

  // Control functions
  // function to push general instruction/CNodeP onto the control
  push(item: ControlItem[]): Runtime {
    return new Runtime(
      this.control.concat([...item].reverse()),
      this.stash,
      this.memory,
    );
  }
  
  pushNode(node: CNodeP[]): Runtime {
    return new Runtime(
      this.control.concat([...node].reverse()),
      this.stash,
      this.memory,
    );
  }
  
  pushInstruction(instruction: Instruction[]): Runtime {
    return new Runtime(
      this.control.concat([...instruction].reverse()),
      this.stash,
      this.memory,
    );
  }
  
  // STASH FUNCTIONS

  pushValue(value: StashItem): Runtime {
    return new Runtime(
      this.control,
      this.stash.push(value),
      this.memory,
    );
  }
  
  popNode(): [ControlItem, Runtime] {
    const [node, newControl] = this.control.pop();
    if(node === undefined) {
      throw new Error("Undefined popped node");
    }
    return [
      node, 
      new Runtime(
        newControl,
        this.stash,
        this.memory,
      )
    ];
  }

  popValue(): [StashItem, Runtime] {
    const [value, newStash] = this.stash.pop();
    if(value === undefined) {
      throw new Error("Undefined popped stash value");
    }
    return [
      value, 
      new Runtime(
        this.control,
        newStash,
        this.memory,
      )
    ];
  }

  hasCompleted(): boolean {
    return this.control.isEmpty();
  }

  getResult(): any {
    return this.stash.isEmpty() ? null : this.stash.peek();
  }

  peekControl(): ControlItem {
    return this.control.peek();
  }

  popControl(): [ControlItem, Runtime] {
    const [popedItem, newControl] = this.control.pop();
    const newRuntime = new Runtime(
      newControl,
      this.stash,
      this.memory
    )

    if(popedItem === undefined) {
      throw new Error("Cannot pop control: no elements left");
    }

    return [popedItem, newRuntime];
  }

  log(): void {
    console.log("Stash")
    console.log(this.stash);
    console.log("Control")
    console.log(this.control);
  }

  toString(): string {
    let result = "\n----- INTERPRETER STATE -----\n";
    
    result += "\nCONTROL:\n";
    result += this.control.toString();
    
    result += "\n\nSTASH:\n";
    result += this.stash.toString();
    
    result += "\n\nREGISTERED FUNCTIONS:\n";
    if (Runtime.astRootP.functions.length === 0) {
      result += "  <none>";
    } else {
      for (const func of Runtime.astRootP.functions) {
        result += `  ${func.name}\n`;
      }
    }
    
    result += "\n-----------------------------";
    result += this.memory.getFormattedMemoryView();

    return result;
  }

  isControlEmpty(): boolean {
    return this.control.isEmpty();
  }
}