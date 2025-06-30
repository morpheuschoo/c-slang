import { CAstRootP } from "~src/processor/c-ast/core";
import { Runtime } from "~src/interpreter/runtime";
import { Control } from "./utils/control";

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
    Runtime.astRootP = this.astRootNode;
    const mainFunction = Runtime.astRootP.functions.find(x => x.name === "main");

    if(!mainFunction) {
      throw new Error("Main function not defined");
    }
    const initialRuntime = new Runtime(new Control([...mainFunction.body].reverse()));

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