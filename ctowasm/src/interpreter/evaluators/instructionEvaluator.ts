import { Runtime } from "~src/interpreter/runtime";
import { 
  Instruction, 
  InstructionType, 
  BinaryOpInstruction, 
  UnaryOpInstruction, 
  branchOpInstruction,
  popInstruction,
  MemoryLoadInstruction,
  MemoryStoreInstruction,
 } from "~src/interpreter/controlItems/instructions";
import { FloatConstantP } from "~src/processor/c-ast/expression/constants";

export const InstructionEvaluator: {
  [InstrType in Instruction["type"]]: (
    runtime: Runtime, 
    instruction: Extract<Instruction, { type: InstrType }>) => Runtime
} = {
  [InstructionType.UNARY_OP]: (runtime: Runtime, instruction: UnaryOpInstruction): Runtime => {
    
    const [operand, runtimeAfterPop] = runtime.popValue();
    let result;
    
    if(operand.type !== "IntegerConstant" && operand.type !== "FloatConstant") {
      throw new Error("Not implemented yet");
    }

    switch (instruction.operator) {
      case '-': result = -operand.value; break;
      case '!': result = !operand.value ? 1 : 0; break; 
      case '+': result = operand.value; break;

      // TODO
      case '~': result = ~operand.value; break;
      case '++': result = Number(operand.value) + 1; break; // Pre-increment
      case '--': result = Number(operand.value) - 1; break; // Pre-decrement
      case '&': result = operand.value; /* Address-of operator, simplified */ break;
      case '*': result = operand.value; /* Dereference operator, simplified */ break;
      default:
        throw new Error(`Unknown unary operator: ${instruction.operator}`);
    }
    const temp : FloatConstantP = {
      type: "FloatConstant",
      value: Number(result),
      dataType: "float",
    }

    return runtimeAfterPop.pushValue(temp);
  },
  
  [InstructionType.BINARY_OP]: (runtime: Runtime, instruction: BinaryOpInstruction): Runtime => {
    const [right, runtimeAfterPopRight] = runtime.popValue();
    const [left, runtimeAfterPopLeft] = runtimeAfterPopRight.popValue();
    
    let result;
    switch (instruction.operator) {
      // case '+': result = left + right; break;
      // case '-': result = left - right; break;
      // case '*': result = left * right; break;
      // case '/': result = left / right; break;
      // case '%': result = left % right; break;
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
    const temp : FloatConstantP = {
      type: "FloatConstant",
      value: Number(result),
      dataType: "float",
    }

    return runtimeAfterPopLeft.pushValue(temp);
  },

  [InstructionType.BRANCH]: (runtime: Runtime, instruction: branchOpInstruction): Runtime => {
    const [condition, runtimeWithPoppedValue] = runtime.popValue();
    const isTrue = Boolean(condition);
    
    if (isTrue) {
      return runtime.pushNode([instruction.trueExpr]);
    }
    return runtime.pushNode([instruction.falseExpr]);
  },

  [InstructionType.MEMORYSTORE]: (runtime: Runtime, instruction: MemoryStoreInstruction): Runtime => {
    const [ address, runtimeAfter ]= runtime.popValue();
    const [ value, e ] = runtimeAfter.popValue();

    console.log("HERHE");
    console.log(address);
    console.log(value);

    if(value.type !== "IntegerConstant") {
      throw new Error("Not implemented yet");
    }

    return runtime.memoryWrite(address, value, instruction.dataType);
  },

  [InstructionType.MEMORYLOAD]: (runtime: Runtime, instruction: MemoryLoadInstruction): Runtime => {
    
    return runtime;
  },

  [InstructionType.POP]: (runtime: Runtime, instruction: popInstruction): Runtime => {
    const [value, runtimeAfterPop] = runtime.popValue();
    return runtimeAfterPop;
  }
};