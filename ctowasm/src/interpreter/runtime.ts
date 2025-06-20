import { Control } from "./utils/control";
import { Stash } from "./utils/stash";
import { CNodeP } from "~src/processor/c-ast/core";
import { 
  Instruction, 
  InstructionType, 
  isInstruction } from "./controlItems/instructions";
import { NodeEvaluator, InstructionEvaluator } from "./evaluator";
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
    
    const [item, newControl] = this.control.pop();
    
    if (!item) {
      return new Runtime([], newControl, this.stash, this.functions, true);
    }
    
    if (isInstruction(item)) {
      return this.evaluateInstruction(item as Instruction, newControl);
    } else {
      return this.evaluateNode(item as CNodeP, newControl);
    }
  }
  
  private evaluateNode(node: CNodeP, newControl: Control): Runtime {
    console.log(`\n=== Evaluating node: ${node.type} ===`);
    
    const evaluator = NodeEvaluator[node.type];
    if (evaluator) {
      const result = evaluator(this, node as any);
      console.log(result.toString());
      return result;
    } else {
      console.warn(`No evaluator found for node type: ${node.type}`);
      const newRuntime = new Runtime(
        [],
        newControl,
        this.stash.push(null), 
        this.functions, 
        newControl.isEmpty()
      );
      console.log(newRuntime.toString());
      return newRuntime;
    }
  }

  private evaluateInstruction(instruction: Instruction, newControl: Control): Runtime {
    console.log(`\n=== Executing instruction: ${instruction.type} ===`);
    
    if (InstructionEvaluator[instruction.type]) {
      const result = InstructionEvaluator[instruction.type](this, instruction as any);
      console.log(result.toString());
      return result;
    } else {
      console.warn(`Unknown instruction type: ${instruction.type}`);
      const newRuntime = new Runtime(
        [],
        newControl,
        this.stash, 
        this.functions, 
        newControl.isEmpty()
      );
      console.log(newRuntime.toString());
      return newRuntime;
    }
  }
  
  addFunction(name: string, def: FunctionDefinitionP): void {
    this.functions.set(name, def);
    console.log(`Registered function: ${name}`);
  }
  
  getFunction(name: string): FunctionDefinitionP | undefined {
    return this.functions.get(name);
  }
  
  pushNode(node: CNodeP): void {
    if (node) {
      this.control.push(node);
    }
  }
  
  pushInstruction(instruction: Instruction): void {
    this.control.push(instruction);
  }
  
  pushValue(value: any): void {
    this.stash.push(value);
  }
  
  popValue(): any {
    return this.stash.pop();
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

}