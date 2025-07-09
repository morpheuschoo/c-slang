import { CAstRootP } from "~src/processor/c-ast/core";
import { Runtime } from "~src/interpreter/runtime";
import { Control } from "./utils/control";
import ModuleRepository, { ModuleName, ModulesGlobalConfig } from "~src/modules";

export class Interpreter {
  private readonly runtimeStack: Runtime[];
  private readonly astRootNode: CAstRootP;
  private readonly includedModules: ModuleName[];
  private readonly moduleConfig: ModulesGlobalConfig;

  constructor(
    astRootNode: CAstRootP,
    includedModules: ModuleName[],
    moduleConfig: ModulesGlobalConfig
  ) {
    this.astRootNode = astRootNode;
    this.runtimeStack = [];
    this.includedModules = includedModules;
    this.moduleConfig = moduleConfig;
  }

  async interpret(): Promise<void> {
    Runtime.astRootP = this.astRootNode;
    Runtime.includedModules = this.includedModules;

    const mainFunction = Runtime.astRootP.functions.find(x => x.name === "main");
    
    if(!mainFunction) {
      throw new Error("Main function not defined");
    }

    // call main
    const initialRuntime = new Runtime(new Control([{
      type: "FunctionCall",
      calledFunction: {
        type: "DirectlyCalledFunction",
        functionName: "main"
      },
      functionDetails: {
        sizeOfParams: 0,
        sizeOfReturn: 4,
        parameters: [],
        returnObjects: [{
          dataType: "signed int",
          offset: 0
        }]
      },
      args: [],
    }]))
    
    Runtime.modules = new ModuleRepository(
      initialRuntime.cloneMemory().memory, 
      new WebAssembly.Table({ element: "anyfunc", initial: 100 }), 
      this.moduleConfig
    );

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