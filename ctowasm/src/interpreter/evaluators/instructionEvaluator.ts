import { Runtime, RuntimeMemoryWrite } from "~src/interpreter/runtime";
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
  CallInstruction,
  StackFrameTearDownInstruction,
 } from "~src/interpreter/controlItems/instructions";
import { performBinaryOperation, performUnaryOperation } from "~src/processor/evaluateCompileTimeExpression";
import { determineResultDataTypeOfBinaryExpression } from "~src/processor/expressionUtil";
import { getSizeOfScalarDataType, isIntegerType } from "~src/common/utils";
import { getAdjustedIntValueAccordingToDataType } from "~src/processor/processConstant";
import { FloatDataType, IntegerDataType, UnaryOperator } from "~src/common/types";
import { DirectlyCalledFunction } from "~src/processor/c-ast/function";
import { MemoryWriteInterface } from "../memory";
import { LocalAddress } from "~src/processor/c-ast/memory";
import { StashItem } from "../utils/stash";

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

    return runtimeAfter.memoryWrite([{
      type: "RuntimeMemoryWrite",
      address: address,
      value: value, 
      datatype: instruction.dataType}]);
  },

  [InstructionType.MEMORYLOAD]: (runtime: Runtime, instruction: MemoryLoadInstruction): Runtime => {
    const [ address, _ ] = runtime.popValue();
    return runtime.memoryLoad(address, instruction.dataType);
  },

  [InstructionType.STACKFRAMETEARDOWNINSTRUCTION]: (runtime: Runtime, instruction: StackFrameTearDownInstruction): Runtime => {
    const newRuntime = runtime.stackFrameTearDown(instruction.stackPointer, instruction.basePointer);

    return newRuntime;
  },

  [InstructionType.CALLINSTRUCTION]: (runtime: Runtime, instruction: CallInstruction): Runtime => {
    const numOfParameters = instruction.functionDetails.parameters.length;
    
    let parameters: StashItem[] = [], popedRuntime = runtime;
    for(let i = 0;i < numOfParameters; i++) {
      const [parameter, newRuntime] = popedRuntime.popValue();

      parameters.push(parameter);
      popedRuntime = newRuntime;
    }
    parameters.reverse();

    if(instruction.calledFunction.type === "IndirectlyCalledFunction") {
      throw new Error("Indirectly Called Function not implemented yet");
    }

    const calledFunction = instruction.calledFunction;
    calledFunction as DirectlyCalledFunction;

    if(calledFunction.functionName === "print_int") {
      const temp = parameters[0];
      if(temp.type !== "IntegerConstant") {
        throw new Error("FUKK");
      }

      console.log("PRINTED VALUE: ", temp.value);
      return popedRuntime;
    }

    const func = Runtime.astRootP.functions.find(x => x.name === calledFunction.functionName);
    if(!func) {
      throw new Error("No function called: " + calledFunction.functionName);
    }
    
    // internal functions (defined by user)
    const sizeOfParams = instruction.functionDetails.sizeOfParams;
    const sizeOfLocals = func.sizeOfLocals;
    const sizeOfReturn = instruction.functionDetails.sizeOfReturn;

    // Set up a new Stackframe
    const newRuntime = popedRuntime.stackFrameSetup(
      sizeOfParams,
      sizeOfLocals,
      sizeOfReturn
    )
    
    let offset = 0;
    // Write parameters into memory
    const writeParameters : RuntimeMemoryWrite[] = parameters.map(writeObject => {
      if(writeObject.type === "IntegerConstant" || writeObject.type === "FloatConstant") {
        const size = getSizeOfScalarDataType(writeObject.dataType)
        offset -= size;

        const writeAddress : LocalAddress = {
          type: "LocalAddress",
          offset: {
            type: "IntegerConstant",
            value: BigInt(offset),
            dataType: "unsigned int"
          },
          dataType: "pointer"
        }

        const res : RuntimeMemoryWrite = {
          type: "RuntimeMemoryWrite",
          address: writeAddress,
          value: writeObject,
          datatype: writeObject.dataType
        }

        return res;
      } else {
        throw new Error("Not implemented yet: pointers as function arguments");
      }
    })
    const writtenRuntime = newRuntime.memoryWrite(writeParameters);

    // push body statements
    const resultRuntime = writtenRuntime.push(func.body);

    return resultRuntime;
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