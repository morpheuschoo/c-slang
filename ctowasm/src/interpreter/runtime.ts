import { Stack } from "./stack";
import { CNodeP } from "~src/processor/c-ast/core";
import { 
  Instruction, 
  InstructionType, 
  isInstruction } from "./instructions";
import { NodeEvaluator, InstructionEvaluator } from "./evaluator";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";

export class Runtime {
  private control: Stack<CNodeP | Instruction>;
  private stash: Stack<any>;
  private functions: Map<string, FunctionDefinitionP>;

  constructor(program: CNodeP[]) {
    this.control = new Stack<CNodeP | Instruction>();
    this.stash = new Stack<any>();
    this.functions = new Map<string, FunctionDefinitionP>();
    
    for (let i = program.length - 1; i >= 0; i--) {
      this.control.push(program[i]);
    }
  }
  
  next(): boolean {
    if (this.control.isEmpty()) {
      return false;
    }
    
    const item = this.control.pop();
    
    if (!item) {
      return false;
    }
    
    if (isInstruction(item)) {
      this.evaluateInstruction(item as Instruction);
    } else {
      this.evaluateNode(item as CNodeP);
    }
    
    this.printState();
    
    return !this.control.isEmpty();
  }
  
  private evaluateNode(node: CNodeP): void {
    console.log(`\n=== Evaluating node: ${node.type} ===`);
    
    const evaluator = NodeEvaluator[node.type];
    if (evaluator) {
      evaluator(this, node as any);
    } else {
      console.warn(`No evaluator found for node type: ${node.type}`);
      this.pushValue(null);
    }
  }

  private evaluateInstruction(instruction: Instruction): void {
    console.log(`\n=== Executing instruction: ${instruction.type} ===`);
    
    if (InstructionEvaluator[instruction.type]) {
      InstructionEvaluator[instruction.type](this, instruction as any);
    } else {
      console.warn(`Unknown instruction type: ${instruction.type}`);
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
  
  printState(): void {
    console.log("\n----- INTERPRETER STATE -----");
    
    console.log("\nCONTROL:");
    if (this.control.isEmpty()) {
      console.log("  <empty>");
    } else {
      const controlItems = this.control.getStack();
      for (let i = controlItems.length - 1; i >= 0; i--) {
        const item = controlItems[i];
        if (isInstruction(item)) {
          if (item.type === InstructionType.BINARY_OP) {
            console.log(`  ${controlItems.length - i}. [Instruction] ${item.type}: '${(item as any).operator}'`);
          } else if (item.type === InstructionType.UNARY_OP) {
            console.log(`  ${controlItems.length - i}. [Instruction] ${item.type}: '${(item as any).operator}'`);
          }
        } else {
          const nodeItem = item as any;
          let additionalInfo = '';
          switch (nodeItem.type) {
            case 'FunctionDefinition':
              additionalInfo = nodeItem.name ? `: ${nodeItem.name}` : '';
              break;
            case 'IntegerConstant':
            case 'FloatConstant':
              additionalInfo = nodeItem.value !== undefined ? `: ${nodeItem.value}` : '';
              break;
            case 'BinaryExpression':
              additionalInfo = nodeItem.operator ? `: '${nodeItem.operator}'` : '';
              break;
          }
          console.log(`  ${controlItems.length - i}. [Node] ${nodeItem.type}${additionalInfo}`);
        }
      }
    }
    
    console.log("\nSTASH:");
    if (this.stash.isEmpty()) {
      console.log("  <empty>");
    } else {
      const stashItems = this.stash.getStack();
      for (let i = stashItems.length - 1; i >= 0; i--) {
        const item = stashItems[i];
        console.log(`  ${stashItems.length - i}. ${formatStashItem(item)}`);
      }
    }
    
    console.log("\nREGISTERED FUNCTIONS:");
    if (this.functions.size === 0) {
      console.log("  <none>");
    } else {
      for (const [name, _] of this.functions) {
        console.log(`  ${name}`);
      }
    }
    
    console.log("\n-----------------------------");
  }
}

function formatStashItem(item: any): string {
  if (item === null) return "null";
  if (item === undefined) return "undefined";
  
  if (typeof item === "number" || typeof item === "boolean") {
    return item.toString();
  }
  
  if (typeof item === "string") {
    return `"${item}"`;
  }
  
  if (Array.isArray(item)) {
    return `Array(${item.length})`;
  }
  
  if (typeof item === "object") {
    return `Object: ${JSON.stringify(item).substring(0, 50)}${JSON.stringify(item).length > 50 ? '...' : ''}`;
  }
  
  return String(item);
}