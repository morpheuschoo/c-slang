import { Control } from "~src/interpreter/utils/control";
import { Stash } from "~src/interpreter/utils/stash";
import { CNodeP } from "~src/processor/c-ast/core";
import { Instruction, isInstruction } from "~src/interpreter/controlItems/instructions";
import { NodeEvaluator } from "~src/interpreter/evaluators/nodeEvaluator";
import { InstructionEvaluator } from "~src/interpreter/evaluators/instructionEvaluator";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";


export class Runtime {
  private readonly control: Control;
  private readonly stash: Stash;
  
  // To be removed and use FunctionTable provided in CAstRootP
  private readonly functions: ReadonlyMap<string, FunctionDefinitionP>;

  // To be impoved
  private readonly isCompleted: boolean;

  constructor(
    program: ReadonlyArray<CNodeP>, 
    control?: Control,
    stash?: Stash,
    functions?: ReadonlyMap<string, FunctionDefinitionP>,
    isCompleted: boolean = false
  ) {
    this.stash = stash || new Stash();
    this.functions = functions || new Map<string, FunctionDefinitionP>();
    this.isCompleted = isCompleted;
    
    if (!control && program.length > 0) {
      let newControl = new Control();
      for (let i = program.length - 1; i >= 0; i--) {
        newControl = newControl.push(program[i]);
      }
      this.control = newControl;
    } else {
      this.control = control || new Control();
    }
  }
  
  next(): Runtime {
    if (this.isCompleted || this.control.isEmpty()) {
      return new Runtime([], this.control, this.stash, this.functions, true);
    }
    
    // maybe should fix this???
    const [item, newControl] = this.control.pop();
    if (item === undefined) {
      return new Runtime(
        [],
        newControl,
        this.stash,
        this.functions,
        newControl.isEmpty()
      );
    }

    const thisWithPoppedControl = new Runtime(
      [],
      newControl,
      this.stash,
      this.functions,
      newControl.isEmpty()
    );

    if (isInstruction(item)) {
      return thisWithPoppedControl.evaluateInstruction(item as Instruction);
    } else {
      return thisWithPoppedControl.evaluateNode(item as CNodeP);
    }
  }
  
  private evaluateNode(node: CNodeP): Runtime {
    const evaluator = NodeEvaluator[node.type];
    if (evaluator) {
      const result = evaluator(this, node as any);
      return result;
    } else {

      // should not even come here
      const newRuntime = new Runtime(
        [],
        this.control,
        this.stash.push(null), 
        this.functions, 
        this.isCompleted
      );
      return newRuntime;
    }
  }

  private evaluateInstruction(instruction: Instruction): Runtime {
    if (InstructionEvaluator[instruction.type]) {
      const result = InstructionEvaluator[instruction.type](this, instruction as any);
      return result;
    } else {

      // should not even come here
      const newRuntime = new Runtime(
        [],
        this.control,
        this.stash, 
        this.functions, 
        this.isCompleted
      );
      return newRuntime;
    }
  }
  
  // TODO
  addFunction(name: string, def: FunctionDefinitionP): Runtime {
    const newFunctions = new Map(this.functions);
    newFunctions.set(name, def);
    return new Runtime(
      [],
      this.control,
      this.stash,
      newFunctions,
      this.isCompleted
    );
  }
  
  // TODO
  getFunction(name: string): FunctionDefinitionP | undefined {
    return this.functions.get(name);
  }
  
  pushNode(node: CNodeP): Runtime {
    if (!node) return this;
    
    return new Runtime(
      [],
      this.control.push(node),
      this.stash,
      this.functions,
      false
    );
  }
  
  pushInstruction(instruction: Instruction): Runtime {
    return new Runtime(
      [],
      this.control.push(instruction),
      this.stash,
      this.functions,
      false
    );
  }
  
  pushValue(value: any): Runtime {
    return new Runtime(
      [],
      this.control,
      this.stash.push(value),
      this.functions,
      this.isCompleted
    );
  }
  
  popValue(): [any, Runtime] {
    const [value, newStash] = this.stash.pop();
    return [
      value, 
      new Runtime(
        [],
        this.control,
        newStash,
        this.functions,
        this.isCompleted
      )
    ];
  }
  
  hasCompleted(): boolean {
    return this.isCompleted || this.control.isEmpty();
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
    if (this.functions.size === 0) {
      result += "  <none>";
    } else {
      for (const [name, _] of this.functions) {
        result += `  ${name}\n`;
      }
    }
    
    result += "\n-----------------------------";
    return result;
  }
}