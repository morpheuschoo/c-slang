import { CAstRootP } from "~src/processor/c-ast/core";
import { toJson } from "~src/errors";
import { Runtime } from "./runtime";

export default function interpret(astRootNode: CAstRootP) {
  console.log("=== AST ===");
  console.log(toJson(astRootNode));
  console.log();

  const runtime = new Runtime(astRootNode.functions);
  
  console.log("=== INITIAL STATE ===");
  runtime.printState();
  
  console.log("\n=== EXECUTION ===");

  let stepCount = 0;
  while (true) {
    stepCount++;
    console.log(`\n>>> STEP ${stepCount} <<<`);
    
    if (!runtime.next()) {
      console.log("\nExecution completed - no more items in control stack");
      break;
    }
  }

  console.log(`\n=== EXECUTION COMPLETE (${stepCount} steps) ===`);

  // Get and return the final result
  const result = runtime.getResult();
  console.log(`Final result: ${result}`);
  
  return result;
}