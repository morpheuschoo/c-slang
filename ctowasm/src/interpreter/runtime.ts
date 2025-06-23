import { Control } from "~src/interpreter/utils/control";
import { Stash } from "~src/interpreter/utils/stash";
import { CAstRootP, CNodeP } from "~src/processor/c-ast/core";
import { Instruction, isInstruction } from "~src/interpreter/controlItems/instructions";
import { NodeEvaluator } from "~src/interpreter/evaluators/nodeEvaluator";
import { InstructionEvaluator } from "~src/interpreter/evaluators/instructionEvaluator";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { FunctionTable } from "~src/processor/symbolTable";
import { Memory } from "./memory";
import { ScalarCDataType } from "~src/common/types";
import { Address } from "~src/processor/c-ast/memory";
import { ConstantP } from "~src/processor/c-ast/expression/constants";


export class Runtime {
  private readonly control: Control;
  private readonly stash: Stash;
  private readonly memory: Memory;
  
  // To be removed and use FunctionTable provided in CAstRootP
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
      throw new Error("Unknown node type");
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
  memoryWrite(address: Address, value: ConstantP, datatype: ScalarCDataType) {
    switch (address.type) {
      case "LocalAddress":
        
    }

    return new Runtime(this.control, this.stash, this.memory.write(address, value, datatype))
  }


  // function to push general instruction/CNodeP onto the control
  push(item: (CNodeP | Instruction)[]): Runtime {
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
  
  pushValue(value: ConstantP): Runtime {
    return new Runtime(
      this.control,
      this.stash.push(value),
      this.memory,
    );
  }
  
  popValue(): [any, Runtime] {
    const [value, newStash] = this.stash.pop();
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
    return result;
  }
}