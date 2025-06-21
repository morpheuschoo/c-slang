import { Runtime } from "~src/interpreter/runtime";
import { InstructionType } from "~src/interpreter/controlItems/instructions";
import { CNodeType } from "~src/interpreter/controlItems/types";
import { CNodeP } from "~src/processor/c-ast/core";
import { FloatConstantP, IntegerConstantP } from "~src/processor/c-ast/expression/constants";
import { BinaryExpressionP, UnaryExpressionP } from "~src/processor/c-ast/expression/expressions";
import { MemoryStore } from "~src/processor/c-ast/memory";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { ReturnStatementP } from "~src/processor/c-ast/statement/jumpStatement";

export const NodeEvaluator: { 
  [Type in CNodeType]?: (
    runtime: Runtime, 
    node: Extract<CNodeP, { type: Type }>) => Runtime 
} = {
  // TODO
  "ReturnStatement": (runtime: Runtime, node: ReturnStatementP): Runtime => {
    return runtime;
  },

  // TODO
  "MemoryStore": (runtime: Runtime, node: MemoryStore): Runtime => {
    const newRuntime = runtime.pushNode(node.value);
    return newRuntime;
  },

  "FunctionDefinition": (runtime: Runtime, node: FunctionDefinitionP): Runtime => {
    let newRuntime = runtime.addFunction(node.name, node);

    if (node.name === "main") {
      if (node.body && node.body.length > 0) {
        for (let i = node.body.length - 1; i >= 0; i--) {
          newRuntime = newRuntime.pushNode(node.body[i]);
        }
      }
    }
    
    return newRuntime;
  },

  "IntegerConstant": (runtime: Runtime, node: IntegerConstantP): Runtime => {
    return runtime.pushValue(node.value);
  },

  "FloatConstant": (runtime: Runtime, node: FloatConstantP): Runtime => {
    return runtime.pushValue(node.value);
  },

  "UnaryExpression": (runtime: Runtime, node: UnaryExpressionP): Runtime => {
    const runtimeWithInstruction = runtime.pushInstruction({
      type: InstructionType.UNARY_OP,
      operator: node.operator
    });
    
    return runtimeWithInstruction.pushNode(node.expr);
  },

  "BinaryExpression": (runtime: Runtime, node: BinaryExpressionP): Runtime => {    
    const runtimeWithInstruction = runtime.pushInstruction({
      type: InstructionType.BINARY_OP,
      operator: node.operator
    });
  
    const runtimeWithRight = runtimeWithInstruction.pushNode(node.rightExpr);
    return runtimeWithRight.pushNode(node.leftExpr);
  }
};