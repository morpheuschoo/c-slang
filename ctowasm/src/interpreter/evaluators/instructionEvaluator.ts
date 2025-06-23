import { Runtime } from "~src/interpreter/runtime";
import { 
  Instruction, 
  InstructionType, 
  BinaryOpInstruction, 
  UnaryOpInstruction, 
  branchOpInstruction,
  popInstruction,
  AssignmentInstruction,
 } from "~src/interpreter/controlItems/instructions";

export const InstructionEvaluator: {
  [InstrType in Instruction["type"]]: (
    runtime: Runtime, 
    instruction: Extract<Instruction, { type: InstrType }>) => Runtime
} = {
  [InstructionType.UNARY_OP]: (runtime: Runtime, instruction: UnaryOpInstruction): Runtime => {
    const [operand, runtimeAfterPop] = runtime.popValue();
    let result;
    
    switch (instruction.operator) {
      case '-': result = -operand; break;
      case '!': result = !operand ? 1 : 0; break; 
      case '+': result = +operand; break;

      // TODO
      case '~': result = ~operand; break;
      case '++': result = operand + 1; break; // Pre-increment
      case '--': result = operand - 1; break; // Pre-decrement
      case '&': result = operand; /* Address-of operator, simplified */ break;
      case '*': result = operand; /* Dereference operator, simplified */ break;
      default:
        console.warn(`Unknown unary operator: ${instruction.operator}`);
        result = null;
    }

    return runtimeAfterPop.pushValue(result);
  },
  
  [InstructionType.BINARY_OP]: (runtime: Runtime, instruction: BinaryOpInstruction): Runtime => {
    const [right, runtimeAfterPopRight] = runtime.popValue();
    const [left, runtimeAfterPopLeft] = runtimeAfterPopRight.popValue();
    
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

    return runtimeAfterPopLeft.pushValue(result);
  },

  [InstructionType.BRANCH]: (runtime: Runtime, instruction: branchOpInstruction): Runtime => {
    const [condition, runtimeWithPoppedValue] = runtime.popValue();
    const isTrue = Boolean(condition);
    
    if (isTrue) {
      return runtime.pushNode([instruction.trueExpr]);
    }
    return runtime.pushNode([instruction.falseExpr]);
  },

  [InstructionType.ASSIGNMENT]: (runtime: Runtime, instruction: AssignmentInstruction): Runtime => {
    const value = runtime.getResult();
    return runtime.push([]);
  },

  [InstructionType.POP]: (runtime: Runtime, instruction: popInstruction): Runtime => {
    const [value, runtimeAfterPop] = runtime.popValue();
    return runtimeAfterPop;
  }
};