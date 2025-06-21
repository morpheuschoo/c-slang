import { CAstRootP } from "~src/processor/c-ast/core";
import { Interpreter } from "~src/interpreter/interpret";

export function interpret(astRootNode: CAstRootP): void {
  const interpreter = new Interpreter(astRootNode);
  interpreter.interpret();
  console.log(interpreter.toString());
}