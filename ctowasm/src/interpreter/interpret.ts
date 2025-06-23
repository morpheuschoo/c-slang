import { CAstRootP } from "~src/processor/c-ast/core";
import { Runtime } from "~src/interpreter/runtime";

export class Interpreter {
  private readonly runtimeStack: Runtime[];
  private readonly astRootNode: CAstRootP;

  constructor(
    astRootNode: CAstRootP
  ) {
    this.astRootNode = astRootNode;
    this.runtimeStack = [];
  }

  interpret(): void {
    const initialRuntime = new Runtime(this.astRootNode.functions);
    this.runtimeStack.push(initialRuntime);
    
    let currentRuntime = initialRuntime;
    
    while (!currentRuntime.hasCompleted()) {  
      currentRuntime = currentRuntime.next();
      this.runtimeStack.push(currentRuntime);
    }
  }

  toString(): string {
    if (this.runtimeStack.length === 0) {
      return "Runtime Stack: <empty>";
    }
    
    let result = `Runtime Stack: ${this.runtimeStack.length} states\n`;
    
    for (let i = 0; i < this.runtimeStack.length; i++) {
      result += `\n====== State ${i + 1} ======\n`;
      result += this.runtimeStack[i].toString();
      result += "\n";
    }
    
    return result;
  }
}