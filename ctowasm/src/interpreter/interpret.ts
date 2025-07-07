import { CAstRootP } from "~src/processor/c-ast/core";
import { Runtime } from "~src/interpreter/runtime";
import { Control } from "./utils/control";
import ModuleRepository, { ModuleName } from "~src/modules";

export class Interpreter {
  private readonly runtimeStack: Runtime[];
  private readonly astRootNode: CAstRootP;
  private readonly includedModules: ModuleName[];

  constructor(
    astRootNode: CAstRootP,
    includedModules: ModuleName[]
  ) {
    this.astRootNode = astRootNode;
    this.runtimeStack = [];
    this.includedModules = includedModules;
  }

  async interpret(): Promise<void> {
    Runtime.astRootP = this.astRootNode;
    Runtime.includedModules = this.includedModules;
    console.log(this.astRootNode);

    const mainFunction = Runtime.astRootP.functions.find(x => x.name === "main");
    
    if(!mainFunction) {
      throw new Error("Main function not defined");
    }
    const initialRuntime = new Runtime(new Control([...mainFunction.body].reverse()));
    
    Runtime.modules = new ModuleRepository(initialRuntime.cloneMemory().memory);

    for(const moduleName of Runtime.includedModules) {
      if (typeof Runtime.modules.modules[moduleName].instantiate !== "undefined") {
        await (Runtime.modules.modules[moduleName].instantiate as () => Promise<void>)();
      }
    }
    this.runtimeStack.push(initialRuntime);
    
    let currentRuntime = initialRuntime;
    
    console.log(currentRuntime.toString());

    while (!currentRuntime.hasCompleted()) {
      currentRuntime = currentRuntime.next();
      console.log(currentRuntime.toString());
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