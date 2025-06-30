import { ControlItem, Control } from "~src/interpreter/utils/control";
import { StashItem, Stash} from "~src/interpreter/utils/stash";
import { CAstRootP, CNodeP } from "~src/processor/c-ast/core";
import { Instruction, isInstruction } from "~src/interpreter/controlItems/instructions";
import { NodeEvaluator } from "~src/interpreter/evaluators/nodeEvaluator";
import { InstructionEvaluator } from "~src/interpreter/evaluators/instructionEvaluator";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { Memory } from "./memory";
import { ScalarCDataType } from "~src/common/types";
import { Address, MemoryLoad } from "~src/processor/c-ast/memory";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { SharedWasmGlobalVariables } from "~src/modules";


export class Runtime {
  private readonly control: Control;
  private readonly stash: Stash;
  private readonly memory: Memory;
  
  public static astRootP: CAstRootP;

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
  memoryWrite(address: Address | ConstantP, value: ConstantP, datatype: ScalarCDataType) : Runtime {
    switch(address.type) {
      case "LocalAddress": {
        const writeAddress = BigInt(this.memory.sharedWasmGlobalVariables.basePointer.value) + address.offset.value;
        return new Runtime(this.control, this.stash, this.memory.write([{
          type: "MemoryWriteInterface",
          address: writeAddress,
          value: value,
          dataType: datatype
        }]));
      }

      case "DataSegmentAddress": {
        const writeAddress = address.offset.value;
        return new Runtime(this.control, this.stash, this.memory.write([{
          type: "MemoryWriteInterface",
          address: writeAddress,
          value: value,
          dataType: datatype
        }]));
      }
      
      case "IntegerConstant": {
        const writeAddress = address.value
        return new Runtime(this.control, this.stash, this.memory.write([{
          type: "MemoryWriteInterface",
          address: writeAddress,
          value: value,
          dataType: datatype
        }]));
      }
      
      case "ReturnObjectAddress": {
        if(address.subtype === "load") {
          throw new Error("Return object load instruction found in memory write")
        }
        const writeAddress = address.offset.value;
        return new Runtime(this.control, this.stash, this.memory.write([{
          type: "MemoryWriteInterface",
          address: writeAddress,
          value: value,
          dataType: datatype
        }]));
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
        return this.pushValue(this.memory.load(writeAddress, dataType));
      }
      
      case "IntegerConstant": {
        const writeAddress = address.value
        return this.pushValue(this.memory.load(writeAddress, dataType));
      }
      
      case "ReturnObjectAddress": {
        if(address.subtype === "load") {
          throw new Error("Return object load instruction found in memory write")
        }
        const writeAddress = address.offset.value;
        return this.pushValue(this.memory.load(writeAddress, dataType));
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

  stackFrameSetup(sizeOfParams: number, sizeOfLocals: number, sizeOfReturn: number): Runtime {
    const newMemory = this.memory.stackFrameSetup(sizeOfParams, sizeOfLocals, sizeOfReturn);

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
      this.control.concat(item.reverse()),
      this.stash,
      this.memory,
    );
  }
  
  pushNode(node: CNodeP[]): Runtime {
    return new Runtime(
      this.control.concat(node.reverse()),
      this.stash,
      this.memory,
    );
  }
  
  pushInstruction(instruction: Instruction[]): Runtime {
    return new Runtime(
      this.control.concat(instruction.reverse()),
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
  
  popValue(): [StashItem, Runtime] {
    const [value, newStash] = this.stash.pop();
    if(value === undefined) {
      throw new Error("Undefined poped stash value");
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

  peekStashDepth(depth: number): ReadonlyArray<StashItem> {
    return this.stash.peekLast(depth);
  }
  
  hasCompleted(): boolean {
    return this.control.isEmpty();
  }

  getResult(): any {
    return this.stash.isEmpty() ? null : this.stash.peek();
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
}