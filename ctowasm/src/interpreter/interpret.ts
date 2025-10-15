import { CAstRootP } from "~src/processor/c-ast/core";
import { Runtime } from "~src/interpreter/runtime";
import { Control } from "~src/interpreter/utils/control";
import { Stash } from "~src/interpreter/utils/stash";
import { Memory } from "~src/interpreter/memory";
import ModuleRepository, {
  ModuleName,
  ModulesGlobalConfig,
} from "~src/modules";
import { defaultPosition } from "./utils/constantsUtils";
import { StackFrame } from "./stackFrame";
import { InstructionType, StackFrameTearDownInstruction } from "./controlItems";

export interface CContext {
  astRoot: CAstRootP;
  control: Control;
  stash: Stash;
  memory: Memory;
  stackFrames: StackFrame[];
  step: number;
}

export class Interpreter {
  private readonly runtimeStack: Runtime[];
  private readonly astRootNode: CAstRootP;
  private readonly includedModules: ModuleName[];
  private readonly moduleConfig: ModulesGlobalConfig;
  private readonly sourceCode: string;

  constructor(
    astRootNode: CAstRootP,
    includedModules: ModuleName[],
    moduleConfig: ModulesGlobalConfig,
    sourceCode: string
  ) {
    this.astRootNode = astRootNode;
    this.runtimeStack = []; // CURRENTLY NOT USED WITH HOW INTERPRETER IS SETUP
    this.includedModules = includedModules;
    this.moduleConfig = moduleConfig;
    this.sourceCode = sourceCode;
  }

  async interpretTillStep(targetStep: number): Promise<CContext> {
    Runtime.astRootP = this.astRootNode;
    Runtime.includedModules = this.includedModules;
    Runtime.sourceCode = this.sourceCode;

    const mainFunction = Runtime.astRootP.functions.find(
      (x) => x.name === "main"
    );

    if (!mainFunction) {
      throw new Error("Main function not defined");
    }

    // call main
    const initialRuntime = new Runtime(
      new Control([
        {
          type: "FunctionCall",
          calledFunction: {
            type: "DirectlyCalledFunction",
            functionName: "main",
            position: this.astRootNode.position,
          },
          functionDetails: {
            sizeOfParams: 0,
            sizeOfReturn: 4,
            parameters: [],
            returnObjects: [
              {
                dataType: "signed int",
                offset: 0,
              },
            ],
          },
          args: [],
          position: this.astRootNode.position,
        },
      ])
    );

    Runtime.modules = new ModuleRepository(
      initialRuntime.cloneMemory().memory,
      new WebAssembly.Table({ element: "anyfunc", initial: 2 }),
      this.moduleConfig
    );

    for (const moduleName of Runtime.includedModules) {
      if (
        typeof Runtime.modules.modules[moduleName].instantiate !== "undefined"
      ) {
        await (
          Runtime.modules.modules[moduleName].instantiate as () => Promise<void>
        )();
      }
    }
    this.runtimeStack.push(initialRuntime);

    let currentRuntime = initialRuntime;

    let currStep: number = 0;
    if (targetStep === -1) {
      while (!currentRuntime.isControlEmpty()) {
        currentRuntime = currentRuntime.next();
        this.runtimeStack.push(currentRuntime);
        currStep++;
      }
    } else {
      while (currStep !== targetStep) {
        currentRuntime = currentRuntime.next();
        this.runtimeStack.push(currentRuntime);
        currStep++;
      }
    }

    
    // setup stack frames for visualizer
    const tearDowns: StackFrameTearDownInstruction[] = currentRuntime
    .getControl()
    .getTearDowns()
    .reverse();
    
    // TODO: Do This in a smarter way
    let lastBasePointer: number =
    currentRuntime.getPointers().basePointer.value;
    let lastStackPointer: number = 
    currentRuntime.getPointers().stackPointer.value;
    
    const stackFrames: StackFrame[] = [];
    
    for (let i = 0; i < tearDowns.length; i++) {
      if (tearDowns[i].type !== InstructionType.STACKFRAMETEARDOWNINSTRUCTION) {
        throw new Error("Expected a StackFrameTearDown Instruction");
      }
      
      stackFrames.push(
        new StackFrame(
          tearDowns[i].functionName,
          lastBasePointer,
          lastStackPointer,
          tearDowns[i].sizeOfReturn,
          currentRuntime.getMemory(),
        )
      );
      
      lastBasePointer = tearDowns[i].basePointer;
      lastStackPointer = tearDowns[i].stackPointer;
    }

    return {
      astRoot: this.astRootNode,
      control: currentRuntime.getControl(),
      stash: currentRuntime.getStash(),
      memory: currentRuntime.getMemory(),
      step: currStep,
      stackFrames: stackFrames,
    };
  }

  async interpret(): Promise<void> {
    Runtime.astRootP = this.astRootNode;
    Runtime.includedModules = this.includedModules;

    const mainFunction = Runtime.astRootP.functions.find(
      (x) => x.name === "main"
    );

    if (!mainFunction) {
      throw new Error("Main function not defined");
    }

    // call main
    console.log("Starting interpretation...");
    console.log(this.astRootNode.position);
    const initialRuntime = new Runtime(
      new Control([
        {
          type: "FunctionCall",
          calledFunction: {
            type: "DirectlyCalledFunction",
            functionName: "main",
            position: defaultPosition,
          },
          functionDetails: {
            sizeOfParams: 0,
            sizeOfReturn: 4,
            parameters: [],
            returnObjects: [
              {
                dataType: "signed int",
                offset: 0,
              },
            ],
          },
          args: [],
          position: this.astRootNode.position,
        },
      ])
    );

    Runtime.modules = new ModuleRepository(
      initialRuntime.cloneMemory().memory,
      new WebAssembly.Table({ element: "anyfunc", initial: 100 }),
      this.moduleConfig
    );

    for (const moduleName of Runtime.includedModules) {
      if (
        typeof Runtime.modules.modules[moduleName].instantiate !== "undefined"
      ) {
        await (
          Runtime.modules.modules[moduleName].instantiate as () => Promise<void>
        )();
      }
    }
    this.runtimeStack.push(initialRuntime);

    let currentRuntime = initialRuntime;

    // console.log(currentRuntime.toString());

    while (!currentRuntime.hasCompleted()) {
      currentRuntime = currentRuntime.next();
      // console.log(currentRuntime.toString());
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
