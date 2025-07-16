import { CAstRootP } from "~src/processor/c-ast/core";
import { Interpreter } from "~src/interpreter/interpret";
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

export function evaluateTillStep(
  astRootNode: CAstRootP,
  includedModules: ModuleName[],
  moduleConfig: ModulesGlobalConfig,
  targetStep: number
) {
  const interpreter = new Interpreter(astRootNode, includedModules, moduleConfig);
  interpreter.interpretTillStep(targetStep);
}