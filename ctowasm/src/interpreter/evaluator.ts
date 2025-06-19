import { Runtime } from "./runtime";
import { InstructionType, BinaryOpInstruction, Instruction, UnaryOpInstruction } from "./instructions";
import { CNodeType } from "./types";
import { CNodeP } from "~src/processor/c-ast/core";
import { FloatConstantP, IntegerConstantP } from "~src/processor/c-ast/expression/constants";
import { BinaryExpressionP, UnaryExpressionP } from "~src/processor/c-ast/expression/expressions";
import { MemoryStore } from "~src/processor/c-ast/memory";
import { FunctionDefinitionP } from "~src/processor/c-ast/function";
import { ReturnStatementP } from "~src/processor/c-ast/statement/jumpStatement";

/**
 * A collection of functions that evaluate different node types
 */
export const NodeEvaluator: { 
  [Type in CNodeType]?: (
    runtime: Runtime, 
    node: Extract<CNodeP, { type: Type }>) => void 
} = {
  "ReturnStatement": (runtime: Runtime, node: ReturnStatementP): void => {
    console.log(`Evaluating ReturnStatement`);
    console.warn("ReturnStatement evaluation not yet implemented");
  },
  "MemoryStore": (runtime: Runtime, node: MemoryStore): void => {
    console.log(`Evaluating MemoryStore`);
    
    // Evaluate address and value expressions
    runtime.pushNode(node.value);
    
    // Placeholder for memory store operation
    console.warn("MemoryStore evaluation not yet implemented");
  },
  "FunctionDefinition": (runtime: Runtime, node: FunctionDefinitionP): void => {
    console.log(`Evaluating FunctionDefinition: ${node.name}`);
    runtime.addFunction(node.name, node);

    if (node.name === "main") {
      console.log("Found main function, queueing body for execution");
      
      if (node.body && node.body.length > 0) {
        for (let i = node.body.length - 1; i >= 0; i--) {
          runtime.pushNode(node.body[i]);
        }
      }
    }
  },
  "IntegerConstant": (runtime: Runtime, node: IntegerConstantP): void => {
    console.log(`Evaluating IntegerConstant: ${node.value}`);
    runtime.pushValue(node.value);
  },
  "FloatConstant": (runtime: Runtime, node: FloatConstantP): void => {
    console.log(`Evaluating FloatConstant: ${node.value}`);
    runtime.pushValue(node.value);
  },
  "UnaryExpression": (runtime: Runtime, node: UnaryExpressionP): void => {
    console.log(`Evaluating UnaryExpression with operator: ${node.operator}`);
    
    runtime.pushInstruction({
      type: InstructionType.UNARY_OP,
      operator: node.operator
    });
    
    runtime.pushNode(node.expr);
  },
  "BinaryExpression": (runtime: Runtime, node: BinaryExpressionP): void => {
    console.log(`Evaluating BinaryExpression with operator: ${node.operator}`);
    
    runtime.pushInstruction({
      type: InstructionType.BINARY_OP,
      operator: node.operator
    });
  
    runtime.pushNode(node.rightExpr);
    runtime.pushNode(node.leftExpr);
  }
};

export const InstructionEvaluator: {
  [InstrType in Instruction["type"]]: (
    runtime: Runtime, 
    instruction: Extract<Instruction, { type: InstrType }>) => void
} = {
  [InstructionType.UNARY_OP]: (runtime: Runtime, instruction: UnaryOpInstruction): void => {
    const operand = runtime.popValue();
    let result;
    
    switch (instruction.operator) {
      case '-': result = -operand; break;
      case '!': result = !operand ? 1 : 0; break; 
      case '~': result = ~operand; break;
      case '+': result = +operand; break; // Unary plus
      case '++': result = operand + 1; break; // Pre-increment
      case '--': result = operand - 1; break; // Pre-decrement
      case '&': result = operand; /* Address-of operator, simplified */ break;
      case '*': result = operand; /* Dereference operator, simplified */ break;
      default:
        console.warn(`Unknown unary operator: ${instruction.operator}`);
        result = null;
    }

    console.log(`Evaluated unary ${instruction.operator} operation: ${instruction.operator}${operand} = ${result}`);
    runtime.pushValue(result);
  },
  [InstructionType.BINARY_OP]: (runtime: Runtime, instruction: BinaryOpInstruction): void => {
    const right = runtime.popValue();
    const left = runtime.popValue();
    let result;
    
    switch (instruction.operator) {
      case '+': result = left + right; break;
      case '-': result = left - right; break;
      case '*': result = left * right; break;
      case '/': result = left / right; break;
      case '%': result = left % right; break;
      case '<': result = left < right ? 1 : 0; break;
      case '>': result = left > right ? 1 : 0; break;
      case '<=': result = left <= right ? 1 : 0; break;
      case '>=': result = left >= right ? 1 : 0; break;
      case '==': result = left === right ? 1 : 0; break;
      case '!=': result = left !== right ? 1 : 0; break;
      default: 
        console.warn(`Unknown binary operator: ${instruction.operator}`);
        result = null;
    }

    console.log(`Evaluated ${instruction.operator} operation: ${left} ${instruction.operator} ${right} = ${result}`);
    runtime.pushValue(result);
  }
};