import { ControlItem, Control } from "~src/interpreter/utils/control";
import { StashItem, Stash} from "~src/interpreter/utils/stash";
import { CAstRootP, CNodeP } from "~src/processor/c-ast/core";
import { Instruction, isInstruction } from "~src/interpreter/controlItems/instructions";
import { NodeEvaluator } from "~src/interpreter/evaluators/nodeEvaluator";
import { InstructionEvaluator } from "~src/interpreter/evaluators/instructionEvaluator";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { Memory, MemoryWriteInterface } from "./memory";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { SharedWasmGlobalVariables } from "~src/modules";
import { 
  MemoryAddress,
  RuntimeMemoryPair
} from "~src/interpreter/utils/addressUtils";

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
  private resolveValueToConstantP(value: StashItem): ConstantP {
    // if ConstantP return itself
    if (value.type === "IntegerConstant" || value.type === "FloatConstant") {
      return value;
    }

    // if MemoryAddress convert it to an unsigned int (equivalent)
    return {
      type: "IntegerConstant",
      value: value.value,
      dataType: "unsigned int"
    }
  }

  memoryWrite(pairs: RuntimeMemoryPair[]): Runtime {
    const memoryWriteInterfaceArr: MemoryWriteInterface[] = pairs.map(pair => {
      const writeValue = this.resolveValueToConstantP(pair.value);

      return {
        type: "MemoryWriteInterface",
        address: pair.address.value,
        value: writeValue,
        dataType: pair.address.dataType
      };
    });

    return new Runtime(
      this.control,
      this.stash,
      this.memory.write(memoryWriteInterfaceArr)
    );
  }

  memoryLoad(address: MemoryAddress) {
    const value = this.memory.load(address);
    const [ _, newRuntime ] = this.popValue();
    return newRuntime.pushValue(value);
  }

  stackFrameSetup(sizeOfParams: number, sizeOfLocals: number, sizeOfReturn: number): Runtime {
    const newMemory = this.memory.stackFrameSetup(sizeOfParams, sizeOfLocals, sizeOfReturn);

    return new Runtime(
      this.control,
      this.stash,
      newMemory
    )
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