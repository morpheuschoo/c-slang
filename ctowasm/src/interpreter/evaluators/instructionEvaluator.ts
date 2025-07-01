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
  WhileLoopInstruction,
  BreakMarkInstruction,
  CaseMarkInstruction,
  CaseJumpInstruction,
  isCaseMarkInstruction,
  doCaseInstructionsMatch,
  isDefaultCaseInstruction,
  ContinueMarkInstruction,
  continueMarkInstruction,
 } from "~src/interpreter/controlItems/instructions";
import { performUnaryOperation } from "~src/processor/evaluateCompileTimeExpression";
import { isIntegerType } from "~src/common/utils";
import { getAdjustedIntValueAccordingToDataType } from "~src/processor/processConstant";
import { FloatDataType, IntegerDataType, UnaryOperator } from "~src/common/types";
import { Stash } from "~src/interpreter/utils/stash";
import { isConstantTrue, performConstantBinaryOperation } from "~src/interpreter/utils/operations"

export const InstructionEvaluator: {
  [InstrType in Instruction["type"]]: (
    runtime: Runtime, 
    instruction: Extract<Instruction, { type: InstrType }>) => Runtime
} = {
  [InstructionType.UNARY_OP]: (runtime: Runtime, instruction: UnaryOpInstruction): Runtime => {
    const [operand, runtimeAfterPop] = runtime.popValue();

    if(!Stash.isConstant(operand)) {
      throw new Error(`Unary operation '${instruction.operator} requires an operand, but stash is empty'`)
    }

    /**
     * Bottom evaluation is same as in ~src\processor\evaluateCompileTimeExpression.ts
     * performUnaryOperation has been fixed to support "!" and "~"
     */
    const dataType = operand.dataType;

    let value = performUnaryOperation(operand.value, instruction.operator as UnaryOperator);
    if (isIntegerType(dataType)) {
      value = getAdjustedIntValueAccordingToDataType(value as bigint, dataType);

      return runtimeAfterPop.pushValue({
        type: "IntegerConstant",
        dataType: dataType as IntegerDataType,
        value,
      });
    } else {
      return runtimeAfterPop.pushValue({
        type: "FloatConstant",
        dataType: dataType as FloatDataType,
        value: value as number,
      });
    }
  },
  
  [InstructionType.BINARY_OP]: (runtime: Runtime, instruction: BinaryOpInstruction): Runtime => {
    const [right, runtimeAfterPopRight] = runtime.popValue();
    const [left, runtimeAfterPopLeft] = runtimeAfterPopRight.popValue();

    if (!Stash.isConstant(left) || !Stash.isConstant(right)) {
      throw new Error(`Binary operation '${instruction.operator} requires an operand, but stash is empty'`);
    }

    return runtimeAfterPopLeft.pushValue(performConstantBinaryOperation(left, instruction.operator, right));
  },

  [InstructionType.BRANCH]: (runtime: Runtime, instruction: branchOpInstruction): Runtime => {
    const [condition, runtimeWithPoppedValue] = runtime.popValue();
    
    if (!Stash.isConstant(condition)) {
      throw new Error("Branch instruction expects a boolean")
    }
    
    const isTrue = isConstantTrue(condition);
    
    if (isTrue) {
      return runtimeWithPoppedValue.pushNode(instruction.trueExpr);
    }
    return runtimeWithPoppedValue.pushNode(instruction.falseExpr);
  },

  [InstructionType.MEMORY_STORE]: (runtime: Runtime, instruction: MemoryStoreInstruction): Runtime => {
    const [ address, runtimeAfter ]= runtime.popValue();
    const [ value, _ ] = runtimeAfter.popValue();

    if(!Stash.isConstant(value)) {
      throw new Error("Not implemented yet");
    }

    return runtimeAfter.memoryWrite(address, value, instruction.dataType);
  },

  [InstructionType.MEMORY_LOAD]: (runtime: Runtime, instruction: MemoryLoadInstruction): Runtime => {
    const [ address, _ ] = runtime.popValue();
    return runtime.memoryLoad(address, instruction.dataType);
  },

  [InstructionType.POP]: (runtime: Runtime, instruction: popInstruction): Runtime => {
    const [_, runtimeAfterPop] = runtime.popValue();
    return runtimeAfterPop;
  },

  [InstructionType.WHILE]: (runtime: Runtime, instruction: WhileLoopInstruction): Runtime => {
    let [condition, updatedRuntime] = runtime.popValue();

    if (!Stash.isConstant(condition)) {
      throw new Error("While instruction expects a boolean")
    }
    
    const isTrue = isConstantTrue(condition);

    if (!isTrue) {
      return updatedRuntime;
    }
    
    updatedRuntime = updatedRuntime.push([
      instruction.condition,
      instruction
    ]);

    if (instruction.hasContinue) {
      updatedRuntime = updatedRuntime.push([continueMarkInstruction()]);
    }

    return updatedRuntime.push(instruction.body);
  },

  [InstructionType.CASE_JUMP]: (runtime: Runtime, instruction: CaseJumpInstruction): Runtime => {
    const [right, runtimeAfterPopRight] = runtime.popValue();
    
    let currRuntime = runtimeAfterPopRight;
    
    // if not default case jump instruction perform the below
    if(!isDefaultCaseInstruction(instruction)) {
      let [left, runtimeAfterPopLeft] = runtimeAfterPopRight.popValue();

      if (!Stash.isConstant(left) || !Stash.isConstant(right)) {
        throw new Error(`Case jump requires 2 constants in stash`);
      }

      // manually check for equality
      const isTrue = isConstantTrue(performConstantBinaryOperation(left, "==", right));
      
      // if not true, return stash after popping the case expression
      if (!isTrue) {
        return runtimeAfterPopRight;
      }

      currRuntime = runtimeAfterPopLeft;
    }

    let foundCaseMark = false;

    // if true jump to the respective case mark
    while(!currRuntime.isControlEmpty()) {
      const [item, newRuntime] = currRuntime.popNode();
      currRuntime = newRuntime;

      if (isCaseMarkInstruction(item) && doCaseInstructionsMatch(instruction, item)) {
        foundCaseMark = true;
        break;
      }
    }

    if (!foundCaseMark) {
      throw new Error("Unable to locate associated case mark statement");
    }

    return currRuntime;
  },

  [InstructionType.CASE_MARK]: (runtime: Runtime, instruction: CaseMarkInstruction): Runtime => {
    return runtime;
  },

  [InstructionType.CONTINUE_MARK]: (runtime: Runtime, instruction: ContinueMarkInstruction): Runtime => {
    return runtime;
  },

  [InstructionType.BREAK_MARK]: (runtime: Runtime, instruction: BreakMarkInstruction): Runtime => {
    return runtime;
  },
};