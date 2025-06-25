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
 } from "~src/interpreter/controlItems/instructions";
import { performBinaryOperation, performUnaryOperation } from "~src/processor/evaluateCompileTimeExpression";
import { determineResultDataTypeOfBinaryExpression } from "~src/processor/expressionUtil";
import { isIntegerType } from "~src/common/utils";
import { getAdjustedIntValueAccordingToDataType } from "~src/processor/processConstant";
import { FloatDataType, IntegerDataType, UnaryOperator } from "~src/common/types";

export const InstructionEvaluator: {
  [InstrType in Instruction["type"]]: (
    runtime: Runtime, 
    instruction: Extract<Instruction, { type: InstrType }>) => Runtime
} = {
  [InstructionType.UNARY_OP]: (runtime: Runtime, instruction: UnaryOpInstruction): Runtime => {
    
    const [operand, runtimeAfterPop] = runtime.popValue();

    if(!("value" in operand)) {
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

    if(!("value" in left) || !("value" in right)) {
      throw new Error(`Unary operation '${instruction.operator} requires an operand, but stash is empty'`)
    }

    /**
     * Bottom evaluation is same as in ~src\processor\evaluateCompileTimeExpression.ts
     * However, it has been fixed
     * 
     * NOTE: I think for bitwise operators we need to test it
     */
    let value = performBinaryOperation(
      Number(left.value),
      instruction.operator,
      Number(right.value),
    );

    const dataType = determineResultDataTypeOfBinaryExpression(
      { type: "primary", primaryDataType: left.dataType },
      { type: "primary", primaryDataType: right.dataType },
      instruction.operator,
    );

    if (dataType.type !== "primary") {
      throw new Error("invalid expression")
    };

    if (isIntegerType(dataType.primaryDataType)) {
      const valueInt = getAdjustedIntValueAccordingToDataType(
        BigInt(Math.floor(value)),
        dataType.primaryDataType,
      );

      return runtimeAfterPopLeft.pushValue({
        type: "IntegerConstant",
        dataType: dataType.primaryDataType as IntegerDataType,
        value: valueInt as bigint,
      });
    }
  
    return runtimeAfterPopLeft.pushValue({
      type: "FloatConstant",
      dataType: dataType.primaryDataType as FloatDataType,
      value: value as number,
    });
  },

  [InstructionType.BRANCH]: (runtime: Runtime, instruction: branchOpInstruction): Runtime => {
    const [condition, runtimeWithPoppedValue] = runtime.popValue();
    
    if (!("value" in condition)) {
      throw new Error("Branch instruction expects a boolean")
    }
    
    const isTrue: boolean = condition.value === 1n ? true : false;
    
    if (isTrue) {
      return runtimeWithPoppedValue.pushNode(instruction.trueExpr);
    }
    return runtimeWithPoppedValue.pushNode(instruction.falseExpr);
  },

  [InstructionType.MEMORYSTORE]: (runtime: Runtime, instruction: MemoryStoreInstruction): Runtime => {
    const [ address, runtimeAfter ]= runtime.popValue();
    const [ value, _ ] = runtimeAfter.popValue();

    if(value.type !== "IntegerConstant" && value.type !== "FloatConstant") {
      throw new Error("Not implemented yet");
    }

    return runtimeAfter.memoryWrite(address, value, instruction.dataType);
  },

  [InstructionType.MEMORYLOAD]: (runtime: Runtime, instruction: MemoryLoadInstruction): Runtime => {
    const [ address, _ ] = runtime.popValue();
    return runtime.memoryLoad(address, instruction.dataType);
  },

  [InstructionType.POP]: (runtime: Runtime, instruction: popInstruction): Runtime => {
    const [_, runtimeAfterPop] = runtime.popValue();
    return runtimeAfterPop;
  },

  [InstructionType.WHILE]: (runtime: Runtime, instruction: WhileLoopInstruction): Runtime => {
    const [condition, runtimeWithPoppedValue] = runtime.popValue();

    if (!("value" in condition)) {
      throw new Error("While instruction expects a boolean")
    }
    
    const isTrue: boolean = condition.value === 1n ? true : false;

    if(!isTrue) {
      return runtimeWithPoppedValue;
    }
    return runtimeWithPoppedValue.push([
      instruction.condition,
      instruction
    ]).push(instruction.body);

  }
};