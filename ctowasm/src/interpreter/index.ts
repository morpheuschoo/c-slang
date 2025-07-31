import { CAstRootP } from "~src/processor/c-ast/core";
import { CContext, Interpreter } from "~src/interpreter/interpret";
import { toJson } from "~src/errors";
import { ModuleName, ModulesGlobalConfig } from "~src/modules";

export function interpret(astRootNode: CAstRootP, includedModules: ModuleName[], moduleConfig: ModulesGlobalConfig): void {
  
  // console.log("=== AST ===")
  // console.log(toJson(astRootNode));
  // console.log();

  const interpreter = new Interpreter(astRootNode, includedModules, moduleConfig);
  interpreter.interpret();
  // console.log(interpreter.toString());
}

export async function evaluateTillStep(
  astRootNode: CAstRootP,
  includedModules: ModuleName[],
  moduleConfig: ModulesGlobalConfig,
  targetStep: number
): Promise<CContext> {
  const interpreter = new Interpreter(astRootNode, includedModules, moduleConfig);
  return await interpreter.interpretTillStep(targetStep);
}