import { CAstRootP } from "~src/processor/c-ast/core";
import { Interpreter } from "~src/interpreter/interpret";
import { toJson } from "~src/errors";

export function interpret(astRootNode: CAstRootP): void {
  
  console.log("=== AST ===")
  console.log(toJson(astRootNode));
  console.log();

  const interpreter = new Interpreter(astRootNode);
  interpreter.interpret();
  console.log(interpreter.toString());
}