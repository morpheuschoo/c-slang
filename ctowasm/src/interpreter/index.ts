import { CAstRootP, CNodeP } from "~src/processor/c-ast/core";
import { CContext, Interpreter } from "~src/interpreter/interpret";
import { ModuleName, ModulesGlobalConfig } from "~src/modules";
import { ControlItem, instructionToString, nodeToString } from "./utils/control";
import {
  Instruction,
  isInstruction,
} from "./controlItems";
import { MemoryManager } from "../processor/memoryManager";

export function interpret(
  astRootNode: CAstRootP,
  includedModules: ModuleName[],
  moduleConfig: ModulesGlobalConfig,
  sourceCode: string
): void {
  const interpreter = new Interpreter(
    astRootNode,
    includedModules,
    moduleConfig,
    sourceCode,
    new MemoryManager(),
  );
  interpreter.interpret();
}

export async function evaluateTillStep(
  astRootNode: CAstRootP,
  includedModules: ModuleName[],
  moduleConfig: ModulesGlobalConfig,
  targetStep: number,
  sourceCode: string,
  memoryManager: MemoryManager
): Promise<CContext> {
  const interpreter = new Interpreter(
    astRootNode,
    includedModules,
    moduleConfig,
    sourceCode,
    memoryManager
  );
  return await interpreter.interpretTillStep(targetStep);
}

export function controlItemToString(controlItem: ControlItem): string {
  if (isInstruction(controlItem)) {
    const type = controlItem.type;
    const fn = instructionToString[type] as
      | ((instruction: Instruction) => string)
      | undefined;
    if (fn) {
      return fn(controlItem as Instruction);
    }
  } else {
    const type = controlItem.type;
    const fn = nodeToString[type] as ((node: CNodeP) => string) | undefined;
    if (fn) {
      return fn(controlItem as CNodeP);
    }
  }
  throw new Error("Unknown instruction type");
}
